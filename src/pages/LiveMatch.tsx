import { useEffect, useState } from 'react';
import MatchReport from '../components/MatchReport';
import {
  getMatchState,
  registerPoint,
  type MatchState,
  type RegisterPointResult,
  type SetScore,
} from '../services/matchService';
import { isBreakPoint, type GameMode } from '../services/scoring';
import type { Outcome, Side, Stroke } from '../types/database';

const STROKE_LABELS: Record<Stroke, string> = {
  saque: 'Saque',
  forehand: 'Forehand',
  backhand: 'Backhand',
  voleio: 'Voleio',
  smash: 'Smash',
};

/*
 * Outcomes válidos por golpe: ace/dupla_falta só existem no saque;
 * winner/erro_* só existem na troca de bola após o saque. A view
 * match_stats_summary não quebra winner/erro_* por stroke = 'saque', então
 * essa combinação sumiria da quebra por golpe se fosse lançada.
 */
const SERVE_OUTCOMES: readonly Outcome[] = [
  'ace',
  'dupla_falta',
  'ponto_ganho',
  'ponto_perdido',
];
const RALLY_OUTCOMES: readonly Outcome[] = [
  'winner',
  'erro_nao_forcado',
  'erro_forcado',
  'ponto_ganho',
  'ponto_perdido',
];

const OUTCOME_LABELS: Record<Outcome, string> = {
  ace: 'Ace',
  dupla_falta: 'Dupla falta',
  winner: 'Winner',
  erro_nao_forcado: 'Erro não forçado',
  erro_forcado: 'Erro forçado',
  ponto_ganho: 'Ponto ganho',
  ponto_perdido: 'Ponto perdido',
};

interface LiveMatchProps {
  matchId: string;
  onExit?: () => void;
}

export default function LiveMatch({ matchId, onExit }: LiveMatchProps) {
  const [state, setState] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // O sacador fica selecionado entre pontos (só muda na troca de saque);
  // o golpe também persiste, então o ponto típico é um único tap no resultado.
  const [server, setServer] = useState<Side>('player');
  const [stroke, setStroke] = useState<Stroke>('saque');
  const [pending, setPending] = useState(false);
  const [lastResult, setLastResult] = useState<RegisterPointResult | null>(null);

  useEffect(() => {
    getMatchState(matchId)
      .then(setState)
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, [matchId]);

  async function handleOutcome(outcome: Outcome) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await registerPoint(matchId, { server, stroke, outcome });
      setState(result.state);
      setLastResult(result);
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (!state) {
    return (
      <main className="page">
        {error ? <p className="error">{error}</p> : <p>Carregando partida…</p>}
      </main>
    );
  }

  const completed = state.status === 'completed';
  const mode = currentMode(state);
  const breakPoint =
    !completed && state.currentGame && mode
      ? isBreakPoint(
          {
            playerPoints: state.currentGame.playerPoints,
            opponentPoints: state.currentGame.opponentPoints,
            winner: state.currentGame.winner,
          },
          mode,
          server
        )
      : false;

  return (
    <main className="page live-match">
      <header className="scoreboard">
        <div className="score-names">
          <span>Jogador</span>
          <span>{state.opponentName}</span>
        </div>
        <div className="score-sets">
          {state.sets.map((set) => (
            <div
              key={set.setNumber}
              className={set.winner ? 'set-cell closed' : 'set-cell'}
              title={`Set ${set.setNumber}`}
            >
              {setCellText(set)}
            </div>
          ))}
        </div>
        {!completed && state.currentGame && (
          <div className="score-game">
            <span className="game-label">
              {state.currentGame.isMatchTiebreak
                ? `Match tiebreak (até ${state.rules.matchTiebreakPointsTo})`
                : state.currentGame.isTiebreak
                  ? 'Tiebreak'
                  : `Game ${state.currentGame.gameNumber}`}
            </span>
            <strong>
              {state.currentGame.display.player} – {state.currentGame.display.opponent}
            </strong>
            {breakPoint && <span className="chip break-point">Break point</span>}
          </div>
        )}
      </header>

      {lastResult && !completed && (
        <p className="feedback">
          Ponto: {lastResult.pointWinner === 'player' ? 'Jogador' : state.opponentName}
          {lastResult.gameCompleted && ' · game fechado'}
          {lastResult.setCompleted && ' · set fechado'}
        </p>
      )}
      {error && <p className="error">{error}</p>}

      {completed ? (
        <>
          <p className="feedback">
            Partida encerrada — {state.setsWon.player} sets a {state.setsWon.opponent}.
          </p>
          <MatchReport matchId={matchId} />
          {onExit && (
            <button type="button" className="primary" onClick={onExit}>
              Nova partida
            </button>
          )}
        </>
      ) : (
        <section className="point-entry">
          <div className="entry-group">
            <h2>Sacou</h2>
            <div className="option-row">
              <button
                type="button"
                className={server === 'player' ? 'toggle big selected' : 'toggle big'}
                onClick={() => setServer('player')}
              >
                Jogador
              </button>
              <button
                type="button"
                className={server === 'opponent' ? 'toggle big selected' : 'toggle big'}
                onClick={() => setServer('opponent')}
              >
                {state.opponentName}
              </button>
            </div>
          </div>

          <div className="entry-group">
            <h2>Golpe</h2>
            <div className="option-row wrap">
              {(Object.keys(STROKE_LABELS) as Stroke[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={stroke === option ? 'toggle big selected' : 'toggle big'}
                  onClick={() => setStroke(option)}
                >
                  {STROKE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="entry-group">
            <h2>Resultado (lança o ponto)</h2>
            <div className="option-row wrap">
              {(Object.keys(OUTCOME_LABELS) as Outcome[])
                .filter((option) =>
                  (stroke === 'saque' ? SERVE_OUTCOMES : RALLY_OUTCOMES).includes(option)
                )
                .map((option) => (
                <button
                  key={option}
                  type="button"
                  className="outcome big"
                  disabled={pending}
                  onClick={() => void handleOutcome(option)}
                >
                  {OUTCOME_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/*
 * Reconstrói o GameMode vigente a partir do estado retornado pelo serviço,
 * apenas para exibir o aviso de break point — o cálculo persistido é feito
 * dentro de registerPoint.
 */
function currentMode(state: MatchState): GameMode | null {
  const game = state.currentGame;
  if (!game) return null;
  if (game.isMatchTiebreak) {
    return { kind: 'match_tiebreak', pointsTo: state.rules.matchTiebreakPointsTo };
  }
  if (game.isTiebreak) return { kind: 'tiebreak' };
  return { kind: 'game', noAd: state.rules.noAd };
}

/*
 * Placar de um set: match tiebreak mostra pontos (ex.: 10-8); set comum
 * mostra games, com a parcial do tiebreak entre parênteses quando houver.
 */
function setCellText(set: SetScore): string {
  if (set.isMatchTiebreak) {
    const tiebreak = set.tiebreak;
    return tiebreak ? `${tiebreak.playerPoints}-${tiebreak.opponentPoints}` : '0-0';
  }
  const games = `${set.playerGames}-${set.opponentGames}`;
  return set.tiebreak
    ? `${games} (${set.tiebreak.playerPoints}-${set.tiebreak.opponentPoints})`
    : games;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Erro inesperado.';
}
