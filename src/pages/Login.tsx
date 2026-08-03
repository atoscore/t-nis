import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onGoToSignUp: () => void;
}

export default function Login({ onGoToSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
    }
    // Com sucesso, o onAuthStateChange do App troca para a tela principal.
  }

  return (
    <main className="page auth-page">
      <h1>Entrar</h1>
      <form className="new-match-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p>
        Ainda não tem conta?{' '}
        <button type="button" className="link-button" onClick={onGoToSignUp}>
          Criar conta
        </button>
      </p>
    </main>
  );
}
