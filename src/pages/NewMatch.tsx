import { useEffect, useState, type FormEvent } from 'react';
import { startMatch } from '../services/matchService';
import { createPlayer, listPlayers } from '../services/playerService';
import type { PlayerRow } from '../types/database';

const NEW_PLAYER = '__new__';

interface NewMatchProps {
  onMatchStarted: (matchId: string) => void;
}

export default function NewMatch({ onMatchStarted }: NewMatchProps) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerId, setPlayerId] = useState<string>(NEW_PLAYER);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [location, setLocation] = useState('');
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const [noAd, setNoAd] = useState(false);
  const [finalSetMatchTiebreak, setFinalSetMatchTiebreak] = useState(false);
  const [matchTiebreakPointsTo, setMatchTiebreakPointsTo] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlayers()
      .then((rows) => {
        setPlayers(rows);
        if (rows[0]) setPlayerId(rows[0].id);
      })
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resolvedPlayerId =
        playerId === NEW_PLAYER ? (await createPlayer(newPlayerName)).id : playerId;

      const { match } = await startMatch(
        resolvedPlayerId,
        opponentName,
        bestOf,
        location.trim() || null,
        {
          noAd,
          finalSetMatchTiebreak,
          ...(finalSetMatchTiebreak && { matchTiebreakPointsTo }),
        }
      );
      onMatchStarted(match.id);
    } catch (cause: unknown) {
      setError(errorMessage(cause));
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <h1>Nova partida</h1>
      <form className="new-match-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Jogador analisado
          <select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
            <option value={NEW_PLAYER}>+ Novo jogador…</option>
          </select>
        </label>

        {playerId === NEW_PLAYER && (
          <label>
            Nome do novo jogador
            <input
              type="text"
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
              placeholder="Ex.: João Silva"
              required
            />
          </label>
        )}

        <label>
          Adversário
          <input
            type="text"
            value={opponentName}
            onChange={(event) => setOpponentName(event.target.value)}
            placeholder="Nome do adversário"
            required
          />
        </label>

        <label>
          Local (opcional)
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Clube, quadra…"
          />
        </label>

        <fieldset>
          <legend>Formato</legend>
          <div className="option-row">
            <button
              type="button"
              className={bestOf === 3 ? 'toggle selected' : 'toggle'}
              onClick={() => setBestOf(3)}
            >
              Melhor de 3
            </button>
            <button
              type="button"
              className={bestOf === 5 ? 'toggle selected' : 'toggle'}
              onClick={() => setBestOf(5)}
            >
              Melhor de 5
            </button>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={noAd}
              onChange={(event) => setNoAd(event.target.checked)}
            />
            Sem vantagem (no-ad): em 40-40 o próximo ponto decide o game
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={finalSetMatchTiebreak}
              onChange={(event) => setFinalSetMatchTiebreak(event.target.checked)}
            />
            Set decisivo como match tiebreak
          </label>

          {finalSetMatchTiebreak && (
            <label>
              Pontos do match tiebreak
              <input
                type="number"
                min={2}
                step={1}
                value={matchTiebreakPointsTo}
                onChange={(event) => setMatchTiebreakPointsTo(Number(event.target.value))}
              />
            </label>
          )}
        </fieldset>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Criando…' : 'Iniciar partida'}
        </button>
      </form>
    </main>
  );
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Erro inesperado.';
}
