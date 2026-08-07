import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import CommunityDetail from './pages/CommunityDetail';
import CommunityList from './pages/CommunityList';
import InviteToCommunity from './pages/InviteToCommunity';
import JoinCommunity from './pages/JoinCommunity';
import LiveMatch from './pages/LiveMatch';
import Login from './pages/Login';
import NewCommunity from './pages/NewCommunity';
import NewMatch from './pages/NewMatch';
import PlayerAccess from './pages/PlayerAccess';
import SignUp from './pages/SignUp';

type AuthScreen = 'login' | 'signup';

type View =
  | { name: 'matches' }
  | { name: 'communities' }
  | { name: 'community-new' }
  | { name: 'community-join' }
  | { name: 'community-detail'; communityId: string }
  | { name: 'community-invite'; communityId: string }
  | { name: 'player-access'; playerId: string };

/*
 * Gate de autenticação + navegação mínima por estado:
 * sem sessão -> Login/SignUp; com sessão -> Partidas ou Comunidades.
 * Se o app ganhar mais telas, promover para um router de verdade.
 */
export default function App() {
  // undefined = ainda restaurando a sessão persistida (evita piscar o login).
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [view, setView] = useState<View>({ name: 'matches' });
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        // Logout: descarta a navegação para não reabrir telas de outra conta.
        setMatchId(null);
        setView({ name: 'matches' });
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

  const inCommunities = view.name !== 'matches';

  return (
    <>
      <header className="app-bar">
        <span className="app-title">App Tênis</span>
        <nav className="app-nav">
          <button
            type="button"
            className={inCommunities ? 'nav-link' : 'nav-link selected'}
            onClick={() => setView({ name: 'matches' })}
          >
            Partidas
          </button>
          <button
            type="button"
            className={inCommunities ? 'nav-link selected' : 'nav-link'}
            onClick={() => setView({ name: 'communities' })}
          >
            Comunidades
          </button>
        </nav>
        <span className="app-user">{session.user.email}</span>
        <button
          type="button"
          className="logout"
          onClick={() => void supabase.auth.signOut()}
        >
          Sair
        </button>
      </header>

      {view.name === 'matches' &&
        (matchId === null ? (
          <NewMatch
            onMatchStarted={setMatchId}
            onManageAccess={(playerId) => setView({ name: 'player-access', playerId })}
          />
        ) : (
          <LiveMatch matchId={matchId} onExit={() => setMatchId(null)} />
        ))}

      {view.name === 'player-access' && <PlayerAccess playerId={view.playerId} />}

      {view.name === 'communities' && (
        <CommunityList
          onCreateNew={() => setView({ name: 'community-new' })}
          onSearch={() => setView({ name: 'community-join' })}
          onOpen={(communityId) => setView({ name: 'community-detail', communityId })}
        />
      )}

      {view.name === 'community-new' && (
        <NewCommunity
          onCreated={(communityId) => setView({ name: 'community-detail', communityId })}
          onBack={() => setView({ name: 'communities' })}
        />
      )}

      {view.name === 'community-join' && (
        <JoinCommunity onBack={() => setView({ name: 'communities' })} />
      )}

      {view.name === 'community-detail' && (
        <CommunityDetail
          communityId={view.communityId}
          onInvite={(communityId) => setView({ name: 'community-invite', communityId })}
          onBack={() => setView({ name: 'communities' })}
        />
      )}

      {view.name === 'community-invite' && (
        <InviteToCommunity
          communityId={view.communityId}
          onBack={() => setView({ name: 'community-detail', communityId: view.communityId })}
        />
      )}
    </>
  );
}
