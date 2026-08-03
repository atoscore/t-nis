import { useState, type FormEvent } from 'react';
import {
  getMyMembership,
  requestToJoin,
  searchCommunities,
  type CommunityRow,
} from '../services/communityService';
import type { MemberStatus } from '../types/domain';

interface JoinCommunityProps {
  onBack: () => void;
}

export default function JoinCommunity({ onBack }: JoinCommunityProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommunityRow[] | null>(null);
  const [membershipByCommunity, setMembershipByCommunity] = useState<
    Record<string, MemberStatus | undefined>
  >({});
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (searching) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchCommunities(query);
      // searchCommunities já exclui as minhas, mas pedidos pendentes (e
      // rejeitados) ainda aparecem — busca o estado de cada resultado.
      const memberships = await Promise.all(
        found.map((community) => getMyMembership(community.id))
      );
      const byCommunity: Record<string, MemberStatus | undefined> = {};
      found.forEach((community, index) => {
        // community_members.status é texto livre no banco; MemberStatus é o
        // conjunto de valores que a aplicação de fato grava (ver types/domain).
        byCommunity[community.id] = memberships[index]?.status as
          | MemberStatus
          | undefined;
      });
      setResults(found);
      setMembershipByCommunity(byCommunity);
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setSearching(false);
    }
  }

  async function handleRequest(communityId: string) {
    if (requestingId) return;
    setRequestingId(communityId);
    setError(null);
    try {
      await requestToJoin(communityId);
      setMembershipByCommunity((current) => ({ ...current, [communityId]: 'pending' }));
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <main className="page">
      <button type="button" className="link-button" onClick={onBack}>
        ← Voltar
      </button>
      <h1>Buscar comunidade</h1>

      <form className="search-form" onSubmit={(event) => void handleSearch(event)}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome da comunidade"
          required
        />
        <button type="submit" className="primary" disabled={searching}>
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {results && results.length === 0 && (
        <p className="feedback">Nenhuma comunidade encontrada com esse nome.</p>
      )}

      {results && results.length > 0 && (
        <ul className="community-list">
          {results.map((community) => {
            const status = membershipByCommunity[community.id];
            return (
              <li key={community.id} className="community-result">
                <span className="community-name">{community.name}</span>
                {status === 'accepted' ? (
                  <button type="button" className="toggle" disabled>
                    Você já é membro
                  </button>
                ) : status === 'pending' ? (
                  <button type="button" className="toggle" disabled>
                    Pedido enviado
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    disabled={requestingId === community.id}
                    onClick={() => void handleRequest(community.id)}
                  >
                    Pedir para entrar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Erro inesperado.';
}
