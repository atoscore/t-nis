import { describe, expect, it } from 'vitest';
import {
  computePointWinner,
  computeSetWinner,
  gameDisplay,
  isBreakPoint,
  isTiebreakGame,
  scoreGame,
  setsToWin,
  type GameMode,
} from '../src/services/scoring';
import type { Side } from '../src/types/database';

const P: Side = 'player';
const O: Side = 'opponent';

const GAME: GameMode = { kind: 'game', noAd: false };
const NO_AD: GameMode = { kind: 'game', noAd: true };
const TIEBREAK: GameMode = { kind: 'tiebreak' };
const matchTiebreak = (pointsTo: number): GameMode => ({
  kind: 'match_tiebreak',
  pointsTo,
});

/* Sequência alternada P,O repetida n vezes (placar n-n). */
function evenPoints(n: number): Side[] {
  return Array.from({ length: n }, () => [P, O]).flat();
}

describe('computePointWinner', () => {
  it('atribui o ace ao sacador', () => {
    expect(computePointWinner('player', 'ace')).toBe('player');
    expect(computePointWinner('opponent', 'ace')).toBe('opponent');
  });

  it('atribui a dupla falta a quem recebe', () => {
    expect(computePointWinner('player', 'dupla_falta')).toBe('opponent');
    expect(computePointWinner('opponent', 'dupla_falta')).toBe('player');
  });

  it('winner e ponto_ganho são pontos do player', () => {
    expect(computePointWinner('opponent', 'winner')).toBe('player');
    expect(computePointWinner('opponent', 'ponto_ganho')).toBe('player');
  });

  it('erros e ponto_perdido são pontos do opponent', () => {
    expect(computePointWinner('player', 'erro_nao_forcado')).toBe('opponent');
    expect(computePointWinner('player', 'erro_forcado')).toBe('opponent');
    expect(computePointWinner('player', 'ponto_perdido')).toBe('opponent');
  });
});

describe('scoreGame (game comum, com vantagem)', () => {
  it('game vazio segue em aberto', () => {
    expect(scoreGame([], GAME)).toEqual({
      playerPoints: 0,
      opponentPoints: 0,
      winner: null,
    });
  });

  it('4 pontos seguidos fecham o game', () => {
    expect(scoreGame([P, P, P, P], GAME).winner).toBe('player');
  });

  it('40-40 não fecha; é deuce', () => {
    expect(scoreGame([P, P, P, O, O, O], GAME).winner).toBeNull();
  });

  it('vantagem sozinha não fecha o game', () => {
    expect(scoreGame([P, P, P, O, O, O, P], GAME).winner).toBeNull();
  });

  it('dois pontos seguidos após o deuce fecham o game', () => {
    expect(scoreGame([P, P, P, O, O, O, P, P], GAME).winner).toBe('player');
  });

  it('deuce alternado só termina com 2 de vantagem', () => {
    const game = scoreGame([P, P, P, O, O, O, O, P, O, O], GAME);
    expect(game.winner).toBe('opponent');
    expect(game).toMatchObject({ playerPoints: 4, opponentPoints: 6 });
  });

  it('mantém o primeiro vencedor se houver ponto excedente', () => {
    expect(scoreGame([P, P, P, P, O], GAME).winner).toBe('player');
  });
});

describe('scoreGame (no-ad)', () => {
  it('em 40-40 o próximo ponto fecha o game', () => {
    const points = [P, P, P, O, O, O];
    expect(scoreGame(points, NO_AD).winner).toBeNull();
    expect(scoreGame([...points, O], NO_AD).winner).toBe('opponent');
    expect(scoreGame([...points, P], NO_AD).winner).toBe('player');
  });

  it('antes do 40-40 nada muda: 4 pontos fecham', () => {
    expect(scoreGame([P, P, P, P], NO_AD).winner).toBe('player');
    expect(scoreGame([P, P, P, O], NO_AD).winner).toBeNull();
  });
});

describe('scoreGame (tiebreak)', () => {
  it('7-5 fecha o tiebreak', () => {
    expect(scoreGame([...evenPoints(5), P, P], TIEBREAK).winner).toBe('player');
  });

  it('7-6 não fecha; precisa de 2 de vantagem', () => {
    const points = [...evenPoints(6), P];
    expect(scoreGame(points, TIEBREAK).winner).toBeNull();
    expect(scoreGame([...points, P], TIEBREAK).winner).toBe('player');
  });
});

describe('scoreGame (match tiebreak)', () => {
  it('7 pontos não fecham quando o alvo é 10', () => {
    expect(scoreGame([P, P, P, P, P, P, P], matchTiebreak(10)).winner).toBeNull();
  });

  it('10-8 fecha o match tiebreak de 10', () => {
    const game = scoreGame([...evenPoints(8), P, P], matchTiebreak(10));
    expect(game.winner).toBe('player');
    expect(game).toMatchObject({ playerPoints: 10, opponentPoints: 8 });
  });

  it('10-9 não fecha; precisa de 2 de vantagem', () => {
    const points = [...evenPoints(9), O];
    expect(scoreGame(points, matchTiebreak(10)).winner).toBeNull();
    expect(scoreGame([...points, O], matchTiebreak(10)).winner).toBe('opponent');
  });

  it('o alvo é dinâmico: com pointsTo = 7 fecha em 7-5', () => {
    expect(scoreGame([...evenPoints(5), P, P], matchTiebreak(7)).winner).toBe('player');
    expect(scoreGame([...evenPoints(5), P, P], matchTiebreak(10)).winner).toBeNull();
  });
});

describe('gameDisplay', () => {
  it('usa a escala 0/15/30/40', () => {
    expect(gameDisplay(scoreGame([P, O, O], GAME), GAME)).toEqual({
      player: '15',
      opponent: '30',
    });
  });

  it('mostra 40-40 no deuce e Ad na vantagem', () => {
    expect(gameDisplay(scoreGame([P, P, P, O, O, O], GAME), GAME)).toEqual({
      player: '40',
      opponent: '40',
    });
    expect(gameDisplay(scoreGame([P, P, P, O, O, O, O], GAME), GAME)).toEqual({
      player: '40',
      opponent: 'Ad',
    });
  });

  it('no-ad não tem estado Ad: 40-40 é o ponto decisivo', () => {
    expect(gameDisplay(scoreGame([P, P, P, O, O, O], NO_AD), NO_AD)).toEqual({
      player: '40',
      opponent: '40',
    });
  });

  it('tiebreak é numérico', () => {
    expect(gameDisplay(scoreGame([P, P, O], TIEBREAK), TIEBREAK)).toEqual({
      player: '2',
      opponent: '1',
    });
  });

  it('match tiebreak é numérico mesmo acima de 4 pontos', () => {
    const game = scoreGame([...evenPoints(8), P], matchTiebreak(10));
    expect(gameDisplay(game, matchTiebreak(10))).toEqual({
      player: '9',
      opponent: '8',
    });
  });
});

describe('computeSetWinner', () => {
  it.each([
    [6, 0, 'player'],
    [6, 4, 'player'],
    [7, 5, 'player'],
    [7, 6, 'player'],
    [4, 6, 'opponent'],
    [5, 7, 'opponent'],
    [6, 7, 'opponent'],
  ])('%i-%i => %s', (playerGames, opponentGames, expected) => {
    expect(computeSetWinner(playerGames, opponentGames)).toBe(expected);
  });

  it.each([
    [0, 0],
    [5, 0],
    [6, 5],
    [5, 6],
    [6, 6],
  ])('%i-%i segue em aberto', (playerGames, opponentGames) => {
    expect(computeSetWinner(playerGames, opponentGames)).toBeNull();
  });
});

describe('isBreakPoint', () => {
  const score = (playerPoints: number, opponentPoints: number) => ({
    playerPoints,
    opponentPoints,
    winner: null,
  });

  it('30-40 com o player sacando é break point', () => {
    expect(isBreakPoint(score(2, 3), GAME, 'player')).toBe(true);
  });

  it('40-30 com o player sacando não é (seria game point do sacador)', () => {
    expect(isBreakPoint(score(3, 2), GAME, 'player')).toBe(false);
  });

  it('40-30 com o opponent sacando é break point do player', () => {
    expect(isBreakPoint(score(3, 2), GAME, 'opponent')).toBe(true);
  });

  it('deuce com vantagem exige 2 de diferença: 40-40 não é break point', () => {
    expect(isBreakPoint(score(3, 3), GAME, 'player')).toBe(false);
  });

  it('vantagem de quem recebe (Ad out) é break point', () => {
    expect(isBreakPoint(score(3, 4), GAME, 'player')).toBe(true);
    expect(isBreakPoint(score(4, 3), GAME, 'player')).toBe(false);
  });

  it('no-ad: o 40-40 já é ponto decisivo, logo break point', () => {
    expect(isBreakPoint(score(3, 3), NO_AD, 'player')).toBe(true);
  });

  it('nunca em tiebreak ou match tiebreak', () => {
    expect(isBreakPoint(score(5, 6), TIEBREAK, 'player')).toBe(false);
    expect(isBreakPoint(score(8, 9), matchTiebreak(10), 'player')).toBe(false);
  });

  it('game já fechado não tem break point', () => {
    expect(
      isBreakPoint({ playerPoints: 1, opponentPoints: 4, winner: 'opponent' }, GAME, 'player')
    ).toBe(false);
  });
});

describe('regras auxiliares', () => {
  it('tiebreak apenas em 6-6', () => {
    expect(isTiebreakGame(6, 6)).toBe(true);
    expect(isTiebreakGame(6, 5)).toBe(false);
    expect(isTiebreakGame(5, 6)).toBe(false);
  });

  it('sets necessários pelo best_of', () => {
    expect(setsToWin(3)).toBe(2);
    expect(setsToWin(5)).toBe(3);
  });
});
