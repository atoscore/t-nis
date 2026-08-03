/*
 * Sistema de seguir (estilo X): perfil público aceita o follow direto,
 * perfil privado fica pendente até o followee responder. Mesmo padrão de
 * aprovação já usado em community_members (pending/accepted), sem inventar
 * um novo — a diferença é que aqui rejeitar remove a linha em vez de marcar
 * 'rejected' (a tabela follows nem aceita esse valor no status).
 */

import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../types/supabase';
import { decideFollowStatus } from './followStatus';

const UNIQUE_VIOLATION = '23505';

export type { FollowStatus } from './followStatus';
export type FollowRow = Tables<'follows'>;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Usuário não autenticado: faça login novamente.');
  }
  return data.user.id;
}

async function isPrivateProfile(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_private')
    .eq('id', userId)
    .single();
  if (error) {
    throw new Error(`Falha ao verificar o perfil do usuário: ${error.message}`);
  }
  return data.is_private;
}

/*
 * Segue um usuário: público entra como 'accepted' direto, privado fica
 * 'pending' até o followee responder (respondToFollowRequest). O banco
 * reforça a mesma regra via follow_status_allowed no insert, então mesmo
 * chamando a API diretamente não dá pra forçar 'accepted' num perfil
 * privado.
 */
export async function followUser(followeeId: string): Promise<FollowRow> {
  const followerId = await requireUserId();
  if (followerId === followeeId) {
    throw new Error('Você não pode seguir a si mesmo.');
  }

  const status = decideFollowStatus(await isPrivateProfile(followeeId));

  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, followee_id: followeeId, status })
    .select()
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error('Você já segue ou já tem um pedido pendente para esta conta.');
    }
    throw new Error(`Falha ao seguir: ${error.message}`);
  }
  return data;
}

/* Pedidos pendentes recebidos — só faz sentido para o followee responder. */
export async function listPendingFollowRequests(): Promise<FollowRow[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('followee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(`Falha ao carregar os pedidos pendentes: ${error.message}`);
  }
  return data;
}

/* Followee aceita (status -> 'accepted') ou rejeita (a linha é removida). */
export async function respondToFollowRequest(
  followId: string,
  accept: boolean
): Promise<void> {
  if (accept) {
    const { error } = await supabase
      .from('follows')
      .update({ status: 'accepted' })
      .eq('id', followId);
    if (error) {
      throw new Error(`Falha ao aceitar o pedido: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase.from('follows').delete().eq('id', followId);
  if (error) {
    throw new Error(`Falha ao rejeitar o pedido: ${error.message}`);
  }
}
