import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../types/supabase';

export type PlayerEditorRow = Tables<'player_editors'>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listMyPlayerGrants(
  playerId: string
): Promise<PlayerEditorRow[]> {
  const normalizedPlayerId = requireUuid(
    playerId,
    'O identificador do jogador é inválido.'
  );

  const { data, error } = await supabase
    .from('player_editors')
    .select('*')
    .eq('player_id', normalizedPlayerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar os acessos do jogador: ${error.message}`);
  }

  return data;
}

export async function grantEditorAccess(
  playerId: string,
  editorUserId: string
): Promise<PlayerEditorRow> {
  const normalizedPlayerId = requireUuid(
    playerId,
    'O identificador do jogador é inválido.'
  );
  const normalizedEditorId = requireUuid(
    editorUserId,
    'UUID da conta do anotador inválido. Cole o UUID completo no formato 00000000-0000-0000-0000-000000000000.'
  );

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error(
      'Usuário não autenticado: faça login antes de conceder acesso.'
    );
  }

  const { data, error } = await supabase
    .from('player_editors')
    .insert({
      player_id: normalizedPlayerId,
      editor_id: normalizedEditorId,
      granted_by: auth.user.id,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    if (isMalformedUuidError(error)) {
      throw new Error(
        'Não foi possível conceder acesso: confira se o UUID da conta do anotador foi copiado por completo.'
      );
    }
    if (error.code === '23503') {
      throw new Error('Nenhuma conta encontrada com esse UUID.');
    }
    throw new Error(`Falha ao conceder acesso ao anotador: ${error.message}`);
  }

  return data;
}

export async function revokeAccess(
  playerEditorId: string
): Promise<PlayerEditorRow> {
  const normalizedGrantId = requireUuid(
    playerEditorId,
    'O identificador do acesso é inválido.'
  );

  const { data, error } = await supabase
    .from('player_editors')
    .update({ status: 'revoked' })
    .eq('id', normalizedGrantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao revogar o acesso: ${error.message}`);
  }

  return data;
}

function requireUuid(value: string, message: string): string {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(message);
  }
  return normalized;
}

function isMalformedUuidError(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === '22P02' ||
    /invalid input syntax for type uuid|invalid uuid/i.test(error.message ?? '')
  );
}
