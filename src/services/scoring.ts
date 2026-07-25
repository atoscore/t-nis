/*
 * Regras puras de pontuação de tênis, sem acesso a banco. Tudo aqui é
 * derivado da sequência de pontos; o estado persistido fica em matchService.
 */

import type { Outcome, Side } from '../types/database';

export function opposite(side: Side): Side {
  return side === 'player' ? 'opponent' : 'player';
}

/*
 * Quem venceu o ponto a partir do evento decisivo.
 *
 * O schema não define de quem é a ação descrita em `outcome`; a convenção
 * adotada (alinhada a match_stats_summary, que trata os golpes como ações do
 * player) é:
 *   - ace: ponto do sacador (campo `server`);
 *   - dupla_falta: ponto de quem recebe o saque;
 *   - winner / ponto_ganho: ponto do player;
 *   - erro_nao_forcado / erro_forcado / ponto_perdido: ponto do opponent.
 * Se o app registrar com outra semântica, ajuste apenas esta função.
 */
export function computePointWinner(server: Side, outcome: Outcome): Side {
  switch (outcome) {
    case 'ace':
      return server;
    case 'dupla_falta':
      return opposite(server);
    case 'winner':
    case 'ponto_ganho':
      return 'player';
    case 'erro_nao_forcado':
    case 'erro_forcado':
    case 'ponto_perdido':
      return 'opponent';
  }
}

export interface GameScore {
  playerPoints: number;
  opponentPoints: number;
  winner: Side | null;
}

/*
 * Formato do "game" em disputa, com a configuração da partida embutida:
 *   - game: game comum, 4 pontos (0-15-30-40). Com noAd = false exige 2 de
 *     vantagem (deuce/vantagem); com noAd = true o ponto em 40-40 é decisivo
 *     e fecha o game direto;
 *   - tiebreak: tiebreak do set em 6-6, 7 pontos com 2 de vantagem;
 *   - match_tiebreak: set decisivo jogado como tiebreak único até pointsTo
 *     pontos (padrão da partida, ex.: 10), com 2 de vantagem.
 */
export type GameMode =
  | { kind: 'game'; noAd: boolean }
  | { kind: 'tiebreak' }
  | { kind: 'match_tiebreak'; pointsTo: number };

function winCondition(mode: GameMode): { target: number; margin: number } {
  switch (mode.kind) {
    case 'game':
      return { target: 4, margin: mode.noAd ? 1 : 2 };
    case 'tiebreak':
      return { target: 7, margin: 2 };
    case 'match_tiebreak':
      return { target: mode.pointsTo, margin: 2 };
  }
}

/*
 * Reduz a sequência de vencedores de ponto ao placar do game, com alvo e
 * margem dados pelo modo.
 * O redutor é tolerante a pontos após o fim do game (o primeiro vencedor é
 * mantido); o bloqueio de registro indevido fica em matchService.
 */
export function scoreGame(points: readonly Side[], mode: GameMode): GameScore {
  const { target, margin } = winCondition(mode);
  let playerPoints = 0;
  let opponentPoints = 0;
  let winner: Side | null = null;

  for (const point of points) {
    if (point === 'player') {
      playerPoints += 1;
    } else {
      opponentPoints += 1;
    }
    if (winner === null) {
      if (playerPoints >= target && playerPoints - opponentPoints >= margin) {
        winner = 'player';
      } else if (opponentPoints >= target && opponentPoints - playerPoints >= margin) {
        winner = 'opponent';
      }
    }
  }

  return { playerPoints, opponentPoints, winner };
}

/*
 * O próximo ponto é break point? Verdadeiro quando quem recebe o saque
 * fecharia o game ao vencer o próximo ponto, segundo o alvo/margem do modo
 * (inclui a variação no-ad, em que o 40-40 já é ponto decisivo). Só existe em
 * game comum: tiebreak e match tiebreak nunca são break point.
 */
export function isBreakPoint(score: GameScore, mode: GameMode, server: Side): boolean {
  if (mode.kind !== 'game' || score.winner !== null) return false;
  const { target, margin } = winCondition(mode);
  const receiverPoints =
    server === 'player' ? score.opponentPoints : score.playerPoints;
  const serverPoints =
    server === 'player' ? score.playerPoints : score.opponentPoints;
  return receiverPoints + 1 >= target && receiverPoints + 1 - serverPoints >= margin;
}

const GAME_POINT_LABELS = ['0', '15', '30', '40'] as const;

export interface GameDisplay {
  player: string;
  opponent: string;
}

/*
 * Placar do game no formato de exibição: 0/15/30/40/Ad no game comum,
 * numérico no tiebreak e no match tiebreak. Com noAd = true não existe
 * estado "Ad": o 40-40 já é o ponto decisivo.
 */
export function gameDisplay(score: GameScore, mode: GameMode): GameDisplay {
  if (mode.kind !== 'game') {
    return {
      player: String(score.playerPoints),
      opponent: String(score.opponentPoints),
    };
  }

  const { playerPoints, opponentPoints } = score;
  if (
    !mode.noAd &&
    playerPoints >= 3 &&
    opponentPoints >= 3 &&
    playerPoints !== opponentPoints
  ) {
    return playerPoints > opponentPoints
      ? { player: 'Ad', opponent: '40' }
      : { player: '40', opponent: 'Ad' };
  }
  return {
    player: GAME_POINT_LABELS[Math.min(playerPoints, 3)] ?? '40',
    opponent: GAME_POINT_LABELS[Math.min(opponentPoints, 3)] ?? '40',
  };
}

/*
 * Vencedor do set dado o placar de games já atualizado: 6 games com 2 de
 * diferença, 7-5, ou 7-6 (este último só ocorre via tiebreak).
 */
export function computeSetWinner(playerGames: number, opponentGames: number): Side | null {
  if (playerGames >= 6 && playerGames - opponentGames >= 2) return 'player';
  if (opponentGames >= 6 && opponentGames - playerGames >= 2) return 'opponent';
  if (playerGames === 7 && opponentGames === 6) return 'player';
  if (opponentGames === 7 && playerGames === 6) return 'opponent';
  return null;
}

/* O game em 6-6 é o tiebreak (game 13 do set). */
export function isTiebreakGame(playerGames: number, opponentGames: number): boolean {
  return playerGames === 6 && opponentGames === 6;
}

/* Sets necessários para vencer: 2 em melhor de 3, 3 em melhor de 5. */
export function setsToWin(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}
