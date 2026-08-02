/*
 * Cálculo puro de atualização de ELO (sem I/O). K-factor fixo e fórmula
 * padrão de probabilidade esperada; quem venceu é decidido fora daqui,
 * reaproveitando a lógica de determinação de vencedor já existente em
 * matchService (applyGameCompletion / ensureOpenSet).
 */

import type { Side } from '../types/database';

const K_FACTOR = 32;

function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export interface EloUpdateResult {
  player: number;
  opponent: number;
}

export function updateEloRatings(
  playerRating: number,
  opponentRating: number,
  winner: Side
): EloUpdateResult {
  const playerScore = winner === 'player' ? 1 : 0;
  const opponentScore = winner === 'opponent' ? 1 : 0;

  const playerExpected = expectedScore(playerRating, opponentRating);
  const opponentExpected = expectedScore(opponentRating, playerRating);

  return {
    player: Math.round(playerRating + K_FACTOR * (playerScore - playerExpected)),
    opponent: Math.round(opponentRating + K_FACTOR * (opponentScore - opponentExpected)),
  };
}
