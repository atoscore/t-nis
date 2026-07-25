import { useEffect, useState, type FormEvent } from 'react';
import {
  grantEditorAccess,
  listMyPlayerGrants,
  revokeAccess,
} from '../services/playerEditorService';
import type {
  PlayerEditorRow,
  PlayerEditorStatus,
} from '../types/database';

export default function PlayerAccess({ playerId }: { playerId: string }) {
  const [grants, setGrants] = useState<PlayerEditorRow[]>([]);
  const [editorUserId, setEditorUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setGrants([]);
    setError(null);
    setSuccess(null);

    listMyPlayerGrants(playerId)
      .then((rows) => {
        if (!cancelled) setGrants(rows);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  async function handleGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const grant = await grantEditorAccess(playerId, editorUserId);
      setGrants((current) => [
        grant,
        ...current.filter((item) => item.id !== grant.id),
      ]);
      setEditorUserId('');
      setSuccess('Acesso concedido ao anotador.');
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(playerEditorId: string) {
    if (revokingId !== null) return;

    setRevokingId(playerEditorId);
    setError(null);
    setSuccess(null);

    try {
      const revoked = await revokeAccess(playerEditorId);
      setGrants((current) =>
        current.map((item) => (item.id === revoked.id ? revoked : item))
      );
      setSuccess('Acesso revogado.');
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <main className="page player-access">
      <h1>Acesso de anotadores</h1>
      <p className="access-intro">
        Conceda acesso a outra conta para que ela possa anotar partidas deste
        jogador.
      </p>

      <form
        className="new-match-form access-form"
        onSubmit={(event) => void handleGrant(event)}
      >
        <label>
          UUID da conta do anotador
          <input
            type="text"
            value={editorUserId}
            onChange={(event) => setEditorUserId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
        <p className="access-note">
          Por enquanto, informe o UUID da conta manualmente. A busca por nome ou
          e-mail será adicionada futuramente.
        </p>
        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? 'Concedendo…' : 'Conceder acesso'}
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="feedback access-success" role="status">
          {success}
        </p>
      )}

      <section className="access-history" aria-labelledby="access-history-title">
        <h2 id="access-history-title">Histórico de acessos</h2>

        {loading ? (
          <p className="feedback" role="status">
            Carregando acessos…
          </p>
        ) : grants.length === 0 ? (
          <p className="feedback">Nenhum acesso concedido até agora.</p>
        ) : (
          <ul className="access-list">
            {grants.map((grant) => (
              <li className="access-item" key={grant.id}>
                <div className="access-details">
                  <code className="access-editor-id">{grant.editor_id}</code>
                  <span
                    className={`access-status access-status-${grant.status}`}
                  >
                    {statusLabel(grant.status)}
                  </span>
                  <span className="access-date">
                    Concedido em {formatDate(grant.created_at)}
                  </span>
                </div>

                {grant.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => void handleRevoke(grant.id)}
                    disabled={revokingId !== null}
                  >
                    {revokingId === grant.id ? 'Revogando…' : 'Revogar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function statusLabel(status: PlayerEditorStatus): string {
  return status === 'active' ? 'Ativo' : 'Revogado';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR').format(date);
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Não foi possível concluir a operação.';
}
