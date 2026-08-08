import { supabase } from '../lib/supabaseClient';
import type { Database, Tables } from '../types/supabase';

export type MatchmakingProfileRow = Tables<'matchmaking_profiles'>;
export type MatchmakingNotificationRow = Tables<'matchmaking_notifications'>;
export type NearbyMatch =
  Database['public']['Functions']['find_nearby_matches']['Returns'][number];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Usuário não autenticado: faça login novamente.');
  }
  return data.user.id;
}

export interface MatchmakingProfileInput {
  latitude: number;
  longitude: number;
  searchRadiusKm: number;
  skillLevel: 'iniciante' | 'intermediario' | 'avancado' | 'profissional';
  availableDays: number[];
  availableStartTime: string | null;
  availableEndTime: string | null;
  isActive: boolean;
}

/*
 * skill_level e available_days têm check constraint no banco — não
 * revalidamos aqui, mesmo padrão do resto dos serviços (o Postgres rejeita
 * e o erro sobe como está).
 */
export async function upsertMyMatchmakingProfile(
  input: MatchmakingProfileInput
): Promise<MatchmakingProfileRow> {
  const userId = await requireUserId();

  // geography(point,4326) espera WKT/EWKT; ordem é lng/lat, não lat/lng.
  const location = `SRID=4326;POINT(${input.longitude} ${input.latitude})`;

  const { data, error } = await supabase
    .from('matchmaking_profiles')
    .upsert(
      {
        account_id: userId,
        location,
        search_radius_km: input.searchRadiusKm,
        skill_level: input.skillLevel,
        available_days: input.availableDays,
        available_start_time: input.availableStartTime,
        available_end_time: input.availableEndTime,
        is_active: input.isActive,
      },
      { onConflict: 'account_id' }
    )
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao salvar seu perfil de matchmaking: ${error.message}`);
  }
  return data;
}

export async function getMyMatchmakingProfile(): Promise<MatchmakingProfileRow | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('matchmaking_profiles')
    .select('*')
    .eq('account_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao carregar seu perfil de matchmaking: ${error.message}`);
  }
  return data;
}

export async function searchNearbyMatches(maxResults = 20): Promise<NearbyMatch[]> {
  const { data, error } = await supabase.rpc('find_nearby_matches', {
    p_max_results: maxResults,
  });
  if (error) {
    throw new Error(`Falha ao buscar jogadores próximos: ${error.message}`);
  }
  return data;
}

/* request_match levanta exceção simples (P0001) pros dois casos abaixo —
 * distinguimos pelo texto da mensagem, não tem código específico. */
export async function requestMatch(
  targetAccountId: string
): Promise<MatchmakingNotificationRow> {
  const trimmed = targetAccountId.trim();
  if (!UUID_PATTERN.test(trimmed)) {
    throw new Error('Identificador da conta inválido.');
  }

  const { data, error } = await supabase.rpc('request_match', {
    p_target_account_id: trimmed,
  });
  if (error) {
    if (error.message.includes('cannot request a match with yourself')) {
      throw new Error('Você não pode pedir uma partida com você mesmo.');
    }
    if (error.message.includes('target has no active matchmaking profile')) {
      throw new Error('Esse jogador não está mais disponível para partidas.');
    }
    throw new Error(`Falha ao pedir a partida: ${error.message}`);
  }
  return data;
}

export async function listMyNotifications(): Promise<MatchmakingNotificationRow[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('matchmaking_notifications')
    .select('*')
    .eq('account_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Falha ao carregar suas notificações: ${error.message}`);
  }
  return data;
}

// RLS (matchmaking_notifications_update_own) já garante que só o dono da
// notificação consegue atualizar — sem checagem client-side.
export async function respondToMatchmakingNotification(
  notificationId: string,
  status: 'read' | 'dismissed'
): Promise<MatchmakingNotificationRow> {
  const { data, error } = await supabase
    .from('matchmaking_notifications')
    .update({ status })
    .eq('id', notificationId)
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao atualizar a notificação: ${error.message}`);
  }
  return data;
}
