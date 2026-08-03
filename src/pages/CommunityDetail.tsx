import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  getCommunity,
  getCommunityRanking,
  getMyMembership,
  listPendingRequests,
  respondToJoinRequest,
  type CommunityMemberRow,
  type CommunityRankingRow,
  type CommunityRow,
} from '../services/communityService';

interface CommunityDetailProps {
  communityId: string;
  onInvite: (communityId: string) => void;
  onBack: () => void;
}

export default function CommunityDetail({
  communityId,
  onInvite,
  onBack,
}: CommunityDetailProps) {
  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [canSeeRanking, setCanSeeRanking] = useState(false);
  const [ranking, setRanking] = useState<CommunityRankingRow[] | null>(null);
  const [pendingRequests, setPendingRequests] = useState<CommunityMemberRow[]>([]);
  const [respondingUserId, setRespondingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        throw new Error('Usuário não autenticado: faça login novamente.');
      }

      const loadedCommunity = await getCommunity(communityId);
      const membership = await getMyMembership(communityId);
      const creator = loadedCommunity.created_by === auth.user.id;
      // Sem participação aceita (ou sem ser criador) a RPC recusa o acesso —
      // nem chega a ser chamada.
      const allowed = creator || membership?.status === 'accepted';

      setCommunity(loadedCommunity);
      setIsCreator(creator);
      setCanSeeRanking(allowed);
      setRanking(allowed ? await getCommunityRanking(communityId) : null);
      setPendingRequests(creator ? await listPendingRequests(communityId) : []);
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRespond(userId: string, accept: boolean) {
    if (respondingUserId) return;
    setRespondingUserId(userId);
    setError(null);
    try {
      await respondToJoinRequest(communityId, userId, accept);
      // Recarrega pedidos e ranking (um aceite muda os dois).
      await load();
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setRespondingUserId(null);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <p>Carregando comunidade…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <button type="button" className="link-button" onClick={onBack}>
        ← Voltar
      </button>
      <h1>{community?.name ?? 'Comunidade'}</h1>

      {error && <p className="error">{error}</p>}

      {!canSeeRanking && !error && (
        <p className="feedback">
          Aguardando aprovação do criador da comunidade. O ranking fica visível
          quando sua participação for aceita.
        </p>
      )}

      {canSeeRanking && ranking && (
        <section>
          <h2>Ranking</h2>
          {ranking.length === 0 ? (
            <p className="feedback">Ainda não há partidas contabilizadas.</p>
          ) : (
            <div className="table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>V</th>
                    <th>D</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((row, index) => (
                    <tr key={row.account_id}>
                      <td>{index + 1}</td>
                      <td>{row.display_name}</td>
                      <td>{row.vitorias}</td>
                      <td>{row.derrotas}</td>
                      <td>{formatPct(row.pct_vitorias)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {isCreator && (
        <section>
          <h2>Pedidos pendentes</h2>
          {pendingRequests.length === 0 ? (
            <p className="feedback">Nenhum pedido aguardando resposta.</p>
          ) : (
            <ul className="pending-list">
              {pendingRequests.map((request) => (
                <li key={request.id} className="pending-row">
                  <span className="pending-user" title={request.user_id}>
                    {request.user_id}
                  </span>
                  <button
                    type="button"
                    className="primary"
                    disabled={respondingUserId === request.user_id}
                    onClick={() => void handleRespond(request.user_id, true)}
                  >
                    Aceitar
                  </button>
                  <button
                    type="button"
                    className="toggle"
                    disabled={respondingUserId === request.user_id}
                    onClick={() => void handleRespond(request.user_id, false)}
                  >
                    Rejeitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className="toggle" onClick={() => onInvite(communityId)}>
            Convidar
          </button>
        </section>
      )}
    </main>
  );
}

/* pct_vitorias já vem da RPC em escala percentual (0 a 100): exibe direto. */
function formatPct(value: number | null): string {
  if (value === null) return '–';
  return `${value.toFixed(1)}%`;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Erro inesperado.';
}
