import { useState, type FormEvent } from 'react';
import { inviteToCommunity } from '../services/communityService';

interface InviteToCommunityProps {
  communityId: string;
  onBack: () => void;
}

/*
 * BLOQUEIO CONHECIDO: não existe busca de usuário por nome/email — players
 * não são contas e não há tabela de perfis públicos. Enquanto essa fonte de
 * dados não existir, o convite pede o UUID da conta colado manualmente.
 */
export default function InviteToCommunity({ communityId, onBack }: InviteToCommunityProps) {
  const [targetUserId, setTargetUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setInvited(false);
    try {
      await inviteToCommunity(communityId, targetUserId);
      setInvited(true);
      setTargetUserId('');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Erro inesperado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <button type="button" className="link-button" onClick={onBack}>
        ← Voltar
      </button>
      <h1>Convidar para a comunidade</h1>

      <p className="feedback">
        Por enquanto não há busca por nome ou email: peça à pessoa o ID da conta
        dela (UUID do Supabase Auth) e cole abaixo. O convite entra direto como
        membro aceito. Esta tela é temporária até existir um diretório de
        usuários.
      </p>

      <form className="new-match-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          ID da conta do convidado (UUID)
          <input
            type="text"
            value={targetUserId}
            onChange={(event) => setTargetUserId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}
        {invited && <p className="feedback">Convite feito — a pessoa já é membro.</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Convidando…' : 'Convidar'}
        </button>
      </form>
    </main>
  );
}
