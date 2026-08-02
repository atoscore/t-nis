import { afterEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../src/lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}));

import { searchProfiles } from '../src/services/profileService';

type MockFn = ReturnType<typeof vi.fn>;

interface FakeQueryBuilder {
  select: MockFn;
  ilike: MockFn;
  order: MockFn;
  limit: MockFn;
  then: (resolve: (value: { data: unknown; error: null }) => unknown) => unknown;
}

function mockProfilesResult(data: unknown): FakeQueryBuilder {
  const builder: FakeQueryBuilder = {
    select: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve) => resolve({ data, error: null }),
  };
  fromMock.mockReturnValue(builder);
  return builder;
}

describe('searchProfiles', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('busca parcial: consulta display_name por ilike e retorna só id/display_name', async () => {
    const builder = mockProfilesResult([
      { id: '1', display_name: 'Ana Silva' },
      { id: '2', display_name: 'Ana Souza' },
    ]);

    const result = await searchProfiles('ana');

    expect(result).toEqual([
      { id: '1', display_name: 'Ana Silva' },
      { id: '2', display_name: 'Ana Souza' },
    ]);
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith('id, display_name');
    expect(builder.ilike).toHaveBeenCalledWith('display_name', '%ana%');
  });

  it('busca vazia: retorna [] sem consultar o banco', async () => {
    mockProfilesResult([{ id: '1', display_name: 'Não deveria aparecer' }]);

    const result = await searchProfiles('   ');

    expect(result).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('busca sem resultado: retorna []', async () => {
    mockProfilesResult([]);

    const result = await searchProfiles('zzz-ninguem-tem-esse-nome');

    expect(result).toEqual([]);
  });
});
