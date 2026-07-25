/*
 * Comunidades e ranking entre contas.
 *
 * Regra de negócio (consequência das policies existentes — UPDATE em
 * community_members é só do criador, não há aceite pelo convidado):
 *   - convite do criador entra direto como status = 'accepted';
 *   - pedido espontâneo entra como 'pending' e só o criador aprova/rejeita.
 * As checagens client-side aqui são para UX; quem garante de verdade é a RLS.
 */

import { supabase } from '../lib/supabaseClient';
import type {
  CommunityMemberRow,
  CommunityRankingRow,
  CommunityRow,
} from '../types/database';

/* Códigos Postgres: violação de chave única / FK / RAISE EXCEPTION. */
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const RAISED_EXCEPTION = 'P0001';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Usuário não autenticado: faça login novamente.');
  }
  return data.user.id;
}

export async function getCommunity(communityId: string): Promise<CommunityRow> {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .single();
  if (error) {
    throw new Error(`Falha ao carregar a comunidade: ${error.message}`);
  }
  return data;
}

/* Comunidades onde sou criador ou membro com status 'accepted'. */
export async function listMyCommunities(): Promise<CommunityRow[]> {
  const userId = await requireUserId();

  const { data: memberships, error: membershipError } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');
  if (membershipError) {
    throw new Error(`Falha ao carregar suas participações: ${membershipError.message}`);
  }

  const memberCommunityIds = memberships.map((row) => row.community_id);
  const baseQuery = supabase.from('communities').select('*');
  const { data, error } =
    memberCommunityIds.length > 0
      ? await baseQuery
          .or(`created_by.eq.${userId},id.in.(${memberCommunityIds.join(',')})`)
          .order('name', { ascending: true })
      : await baseQuery.eq('created_by', userId).order('name', { ascending: true });
  if (error) {
    throw new Error(`Falha ao carregar suas comunidades: ${error.message}`);
  }
  return data;
}

/* Busca por nome, excluindo as comunidades das quais já participo. */
export async function searchCommunities(query: string): Promise<CommunityRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const mine = new Set((await listMyCommunities()).map((community) => community.id));

  // Escapa curingas do ilike para buscar o texto literal.
  const pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`;
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .ilike('name', pattern)
    .order('name', { ascending: true });
  if (error) {
    throw new Error(`Falha ao buscar comunidades: ${error.message}`);
  }
  return data.filter((community) => !mine.has(community.id));
}

export async function createCommunity(name: string): Promise<CommunityRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('O nome da comunidade é obrigatório.');

  const userId = await requireUserId();

  const { data: community, error } = await supabase
    .from('communities')
    .insert({ name: trimmed, created_by: userId })
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao criar a comunidade: ${error.message}`);
  }

  const { error: memberError } = await supabase.from('community_members').insert({
    community_id: community.id,
    user_id: userId,
    invited_by: null,
    status: 'accepted',
  });
  if (memberError) {
    throw new Error(
      `A comunidade foi criada, mas falhou ao registrar sua participação: ${memberError.message}`
    );
  }

  return community;
}

/* Pedido espontâneo: entra como 'pending' até o criador responder. */
export async function requestToJoin(communityId: string): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase.from('community_members').insert({
    community_id: communityId,
    user_id: userId,
    invited_by: null,
    status: 'pending',
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error('Você já tem um pedido ou participação nesta comunidade.');
    }
    throw new Error(`Falha ao pedir entrada na comunidade: ${error.message}`);
  }
}

/* Convite do criador: entra direto como 'accepted' (não há etapa de aceite). */
export async function inviteToCommunity(
  communityId: string,
  targetUserId: string
): Promise<void> {
  const trimmedTarget = targetUserId.trim();
  if (!UUID_PATTERN.test(trimmedTarget)) {
    throw new Error('Informe um ID de conta válido (UUID).');
  }

  const userId = await requireUserId();
  const community = await getCommunity(communityId);
  if (community.created_by !== userId) {
    throw new Error('Apenas o criador da comunidade pode convidar.');
  }

  const { error } = await supabase.from('community_members').insert({
    community_id: communityId,
    user_id: trimmedTarget,
    invited_by: userId,
    status: 'accepted',
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error('Esse usuário já é membro ou já tem pedido nesta comunidade.');
    }
    if (error.code === FOREIGN_KEY_VIOLATION) {
      throw new Error('Nenhuma conta encontrada com esse ID.');
    }
    throw new Error(`Falha ao convidar: ${error.message}`);
  }
}

/* Pedidos espontâneos aguardando resposta — só faz sentido para o criador. */
export async function listPendingRequests(
  communityId: string
): Promise<CommunityMemberRow[]> {
  const { data, error } = await supabase
    .from('community_members')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .is('invited_by', null)
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(`Falha ao carregar os pedidos pendentes: ${error.message}`);
  }
  return data;
}

export async function respondToJoinRequest(
  communityId: string,
  userId: string,
  accept: boolean
): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('community_id', communityId)
    .eq('user_id', userId);
  if (error) {
    throw new Error(`Falha ao responder o pedido: ${error.message}`);
  }
}

export async function getCommunityRanking(
  communityId: string
): Promise<CommunityRankingRow[]> {
  const { data, error } = await supabase.rpc('get_community_ranking', {
    p_community_id: communityId,
  });
  if (error) {
    if (error.code === RAISED_EXCEPTION) {
      throw new Error('Você precisa ser membro para ver o ranking desta comunidade.');
    }
    throw new Error(`Falha ao carregar o ranking: ${error.message}`);
  }
  return data;
}

/* Minha linha em community_members para a comunidade, se existir. */
export async function getMyMembership(
  communityId: string
): Promise<CommunityMemberRow | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('community_members')
    .select('*')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao verificar sua participação: ${error.message}`);
  }
  return data;
}
