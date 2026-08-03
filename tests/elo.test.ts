import { describe, expect, it } from 'vitest';
import { updateEloRatings } from '../src/services/elo';

describe('updateEloRatings', () => {
  it('mantém os ratings quando os dois lados começam iguais e o favorito não existe', () => {
    const result = updateEloRatings(1200, 1200, 'player');
    expect(result.player).toBe(1216);
    expect(result.opponent).toBe(1184);
  });

  it('é simétrico: vencer como opponent espelha o resultado de vencer como player', () => {
    const asPlayer = updateEloRatings(1200, 1200, 'player');
    const asOpponent = updateEloRatings(1200, 1200, 'opponent');
    expect(asOpponent.opponent).toBe(asPlayer.player);
    expect(asOpponent.player).toBe(asPlayer.opponent);
  });

  it('dá poucos pontos ao favorito quando ele vence o azarão', () => {
    const result = updateEloRatings(1800, 1200, 'player');
    expect(result.player).toBeGreaterThan(1800);
    expect(result.player - 1800).toBeLessThan(2);
    expect(result.opponent).toBeLessThan(1200);
  });

  it('dá muitos pontos ao azarão quando ele vence o favorito', () => {
    const result = updateEloRatings(1200, 1800, 'player');
    expect(result.player - 1200).toBeGreaterThan(30);
    expect(result.opponent).toBeLessThan(1800);
  });

  it('preserva a soma dos ratings (K-factor simétrico)', () => {
    const before = 1350 + 1620;
    const result = updateEloRatings(1350, 1620, 'player');
    expect(result.player + result.opponent).toBe(before);
  });
});
