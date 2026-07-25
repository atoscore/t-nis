import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

interface SignUpProps {
  onGoToLogin: () => void;
}

export default function SignUp({ onGoToLogin }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação não confere com a senha.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // Sem sessão na resposta = o projeto exige confirmação de email. Com
    // sessão, o onAuthStateChange do App leva direto à tela principal.
    if (!data.session) {
      setAwaitingConfirmation(true);
    }
  }

  if (awaitingConfirmation) {
    return (
      <main className="page auth-page">
        <h1>Quase lá</h1>
        <p>
          Verifique seu email (<strong>{email}</strong>) para confirmar a conta e
          depois faça login.
        </p>
        <button type="button" className="primary" onClick={onGoToLogin}>
          Ir para o login
        </button>
      </main>
    );
  }

  return (
    <main className="page auth-page">
      <h1>Criar conta</h1>
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
          Senha (mínimo 6 caracteres)
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label>
          Confirmar senha
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p>
        Já tem conta?{' '}
        <button type="button" className="link-button" onClick={onGoToLogin}>
          Entrar
        </button>
      </p>
    </main>
  );
}
