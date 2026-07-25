import { useState, type FormEvent } from 'react';
import { createCommunity } from '../services/communityService';

interface NewCommunityProps {
  onCreated: (communityId: string) => void;
  onBack: () => void;
}

export default function NewCommunity({ onCreated, onBack }: NewCommunityProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const community = await createCommunity(name);
      onCreated(community.id);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Erro inesperado.');
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <button type="button" className="link-button" onClick={onBack}>
        ← Voltar
      </button>
      <h1>Nova comunidade</h1>

      <form className="new-match-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Nome da comunidade
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Clube da Segunda"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Criando…' : 'Criar comunidade'}
        </button>
      </form>
    </main>
  );
}
