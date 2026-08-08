import { afterEach, describe, expect, it, vi } from 'vitest';

const { fromMock, authGetUserMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  authGetUserMock: vi.fn(),
}));

vi.mock('../src/lib/supabaseClient', () => ({
  supabase: { from: fromMock, auth: { getUser: authGetUserMock } },
}));

import {
  listPendingRequests,
  requestAccess,
  respondToAccessRequest,
} from '../src/services/playerEditorService';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const PLAYER_ID = '22222222-2222-2222-2222-222222222222';
const GRANT_ID = '33333333-3333-3333-3333-333333333333';

type MockFn = ReturnType<typeof vi.fn>;

interface FakeQueryBuilder {
  insert: MockFn;
  update: MockFn;
  select: MockFn;
  eq: MockFn;
  order: MockFn;
  single: MockFn;
  then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => unknown;
}

function mockPlayerEditorsResult(data: unknown, error: unknown = null): FakeQueryBuilder {
  const builder: FakeQueryBuilder = {
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => builder),
    then: (resolve) => resolve({ data, error }),
  };
  fromMock.mockReturnValue(builder);
  return builder;
}

describe('requestAccess', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('caminho feliz: insere um pedido pendente pra si mesmo', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const row = {
      id: GRANT_ID,
      player_id: PLAYER_ID,
      editor_id: USER_ID,
      granted_by: USER_ID,
      status: 'pending',
      created_at: '2026-08-07T00:00:00Z',
    };
    const builder = mockPlayerEditorsResult(row);

    const result = await requestAccess(PLAYER_ID);

    expect(result).toEqual(row);
    expect(fromMock).toHaveBeenCalledWith('player_editors');
    expect(builder.insert).toHaveBeenCalledWith({
      player_id: PLAYER_ID,
      editor_id: USER_ID,
      granted_by: USER_ID,
      status: 'pending',
    });
  });

  it('pedido duplicado (23505): mensagem amigável', async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    mockPlayerEditorsResult(null, { code: '23505', message: 'duplicate key' });

    await expect(requestAccess(PLAYER_ID)).rejects.toThrow(
      'Você já tem um pedido ou acesso registrado para esse jogador.'
    );
  });
});

describe('listPendingRequests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('caminho feliz: filtra por player_id e status pending, ordenado por created_at', async () => {
    const rows = [
      { id: GRANT_ID, player_id: PLAYER_ID, editor_id: USER_ID, status: 'pending' },
    ];
    const builder = mockPlayerEditorsResult(rows);

    const result = await listPendingRequests(PLAYER_ID);

    expect(result).toEqual(rows);
    expect(fromMock).toHaveBeenCalledWith('player_editors');
    expect(builder.eq).toHaveBeenCalledWith('player_id', PLAYER_ID);
    expect(builder.eq).toHaveBeenCalledWith('status', 'pending');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });
});

describe('respondToAccessRequest', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('aceita: atualiza status para active', async () => {
    const row = { id: GRANT_ID, status: 'active' };
    const builder = mockPlayerEditorsResult(row);

    const result = await respondToAccessRequest(GRANT_ID, true);

    expect(result).toEqual(row);
    expect(builder.update).toHaveBeenCalledWith({ status: 'active' });
    expect(builder.eq).toHaveBeenCalledWith('id', GRANT_ID);
  });

  it('rejeita: atualiza status para revoked', async () => {
    const row = { id: GRANT_ID, status: 'revoked' };
    const builder = mockPlayerEditorsResult(row);

    const result = await respondToAccessRequest(GRANT_ID, false);

    expect(result).toEqual(row);
    expect(builder.update).toHaveBeenCalledWith({ status: 'revoked' });
  });
});
