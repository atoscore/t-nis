import { useState } from 'react';
import LiveMatch from './pages/LiveMatch';
import NewMatch from './pages/NewMatch';

/*
 * Navegação mínima por estado: configuração -> partida em andamento.
 * Se o app ganhar mais telas, promover para um router de verdade.
 */
export default function App() {
  const [matchId, setMatchId] = useState<string | null>(null);

  return matchId === null ? (
    <NewMatch onMatchStarted={setMatchId} />
  ) : (
    <LiveMatch matchId={matchId} onExit={() => setMatchId(null)} />
  );
}
