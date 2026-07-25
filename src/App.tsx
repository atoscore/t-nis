import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import LiveMatch from './pages/LiveMatch';
import Login from './pages/Login';
import NewMatch from './pages/NewMatch';
import SignUp from './pages/SignUp';

type AuthScreen = 'login' | 'signup';

/*
 * Gate de autenticação + navegação mínima por estado:
 * sem sessão -> Login/SignUp; com sessão -> NewMatch -> LiveMatch.
 * Se o app ganhar mais telas, promover para um router de verdade.
 */
export default function App() {
  // undefined = ainda restaurando a sessão persistida (evita piscar o login).
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        // Logout: descarta a navegação para não reabrir a partida de outra conta.
        setMatchId(null);
        setAuthScreen('login');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <main className="page">
        <p>Carregando…</p>
      </main>
    );
  }

  if (!session) {
    return authScreen === 'login' ? (
      <Login onGoToSignUp={() => setAuthScreen('signup')} />
    ) : (
      <SignUp onGoToLogin={() => setAuthScreen('login')} />
    );
  }

  return (
    <>
      <header className="app-bar">
        <span className="app-title">App Tênis</span>
        <span className="app-user">{session.user.email}</span>
        <button
          type="button"
          className="logout"
          onClick={() => void supabase.auth.signOut()}
        >
          Sair
        </button>
      </header>
      {matchId === null ? (
        <NewMatch onMatchStarted={setMatchId} />
      ) : (
        <LiveMatch matchId={matchId} onExit={() => setMatchId(null)} />
      )}
    </>
  );
}
