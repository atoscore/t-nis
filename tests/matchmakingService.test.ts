import { afterEach, describe, expect, it, vi } from 'vitest';

const { fromMock, rpcMock, authGetUserMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  authGetUserMock: vi.fn(),
}));

vi.mock('../src/lib/supabaseClient', () => ({
  supabase: { from: fromMock, rpc: rpcMock, auth: { getUser: authGetUserMock } },
}));

import {
  getMyMatchmakingProfile,
  requestMatch,
  searchNearbyMatches,
  upsertMyMatchmakingProfile,
} from '../src/services/matchmakingService';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const TARGET_ID = '22222222-2222-2222-2222-222222222222';

type MockFn = ReturnType<typeof vi.fn>;

interface FakeQueryBuilder {
  upsert: MockFn;
  update: MockFn;
  select: MockFn;
  eq: MockFn;
  order: MockFn;
  single: MockFn;
  maybeSingle: MockFn;
  then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => unknown;
}

function mockResult(data: unknown, error: unknown = null): FakeQueryBuilder {
  const builder: FakeQueryBuilder = {
    upsert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    then: (resolve) => resolve({ data, error }),
  };
  fromMock.mockReturnValue(builder);
  return builder;
}

describe('upsertMyMatchmakingProfile', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('monta o WKT (SRID=4326;POINT(lng lat)) e faz upsert por account_id', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const row = { account_id: USER_ID, skill_level: 'intermediario' };
    const builder = mockResult(row);

    const result = await upsertMyMatchmakingProfile({
      latitude: -23.55,
      longitude: -46.63,
      searchRadiusKm: 10,
      skillLevel: 'intermediario',
      availableDays: [0, 6],
      availableStartTime: '08:00',
      availableEndTime: '12:00',
      isActive: true,
    });

    expect(result).toEqual(row);
    expect(fromMock).toHaveBeenCalledWith('matchmaking_profiles');
    expect(builder.upsert).toHaveBeenCalledWith(
      {
        account_id: USER_ID,
        location: 'SRID=4326;POINT(-46.63 -23.55)',
        search_radius_km: 10,
        skill_level: 'intermediario',
        available_days: [0, 6],
        available_start_time: '08:00',
        available_end_time: '12:00',
        is_active: true,
      },
      { onConflict: 'account_id' }
    );
  });
});

describe('getMyMatchmakingProfile', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sem perfil cadastrado: retorna null', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    mockResult(null);

    const result = await getMyMatchmakingProfile();

    expect(result).toBeNull();
  });
});

describe('searchNearbyMatches', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('chama a RPC find_nearby_matches com p_max_results', async () => {
    const rows = [
      { account_id: TARGET_ID, display_name: 'Bia', distance_km: 3.2, skill_level: 'avancado' },
    ];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await searchNearbyMatches(5);

    expect(result).toEqual(rows);
    expect(rpcMock).toHaveBeenCalledWith('find_nearby_matches', { p_max_results: 5 });
  });
});

describe('requestMatch', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mapeia "cannot request a match with yourself" pra mensagem amigável', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'cannot request a match with yourself' },
    });

    await expect(requestMatch(TARGET_ID)).rejects.toThrow(
      'Você não pode pedir uma partida com você mesmo.'
    );
  });

  it('mapeia "target has no active matchmaking profile" pra mensagem amigável', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'target has no active matchmaking profile' },
    });

    await expect(requestMatch(TARGET_ID)).rejects.toThrow(
      'Esse jogador não está mais disponível para partidas.'
    );
  });
});
