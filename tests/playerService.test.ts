import { afterEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('../src/lib/supabaseClient', () => ({
  supabase: { rpc: rpcMock },
}));

import { searchAnalyzablePlayers } from '../src/services/playerService';

describe('searchAnalyzablePlayers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('chama a RPC get_analyzable_players com o termo de busca e devolve o resultado', async () => {
    const rows = [
      { id: '1', name: 'Ana Silva', elo_rating: 1200 },
      { id: '2', name: 'Ana Souza', elo_rating: 1300 },
    ];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await searchAnalyzablePlayers('ana');

    expect(result).toEqual(rows);
    expect(rpcMock).toHaveBeenCalledWith('get_analyzable_players', { p_search: 'ana' });
  });

  it('termo vazio: ainda assim chama a RPC (o backend decide o default, não o client)', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const result = await searchAnalyzablePlayers('   ');

    expect(result).toEqual([]);
    expect(rpcMock).toHaveBeenCalledWith('get_analyzable_players', { p_search: '' });
  });
});
