import { supabase } from '../lib/supabaseClient';
import type { Database, Tables } from '../types/supabase';

export type PlayerRow = Tables<'players'>;
export type AnalyzablePlayer =
  Database['public']['Functions']['get_analyzable_players']['Returns'][number];

export async function listPlayers(): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    throw new Error(`Falha ao carregar jogadores: ${error.message}`);
  }
  return data;
}

// A RPC já trata p_search vazio (devolve os primeiros 50 por nome) — quem
// decide o que é "sem termo" é o backend, não este client, então sempre
// chamamos a RPC (sem o early-return de searchProfiles/searchCommunities).
export async function searchAnalyzablePlayers(query: string): Promise<AnalyzablePlayer[]> {
  const { data, error } = await supabase.rpc('get_analyzable_players', {
    p_search: query.trim(),
  });
  if (error) {
    throw new Error(`Falha ao buscar jogadores: ${error.message}`);
  }
  return data;
}

async function requireAuthUser() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error('Usuário não autenticado: faça login antes de criar um jogador.');
  }
  return auth.user;
}

// players.user_id é UNIQUE (uma conta só pode ter um jogador próprio); checamos antes de inserir pra dar um erro amigável em vez de estourar a constraint.
export async function createOwnPlayer(name: string): Promise<PlayerRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('O nome do jogador é obrigatório.');

  const user = await requireAuthUser();

  const { data: existing, error: existingError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Falha ao verificar jogador existente: ${existingError.message}`);
  }
  if (existing) {
    throw new Error('Você já tem um jogador vinculado à sua conta.');
  }

  const { data, error } = await supabase
    .from('players')
    .insert({ owner_id: user.id, user_id: user.id, name: trimmed })
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao criar o jogador: ${error.message}`);
  }
  return data;
}

// Jogador visitante: sem conta vinculada (user_id = null), pra adversários/analisados sem cadastro no app.
export async function createGuestPlayer(name: string): Promise<PlayerRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('O nome do jogador é obrigatório.');

  const user = await requireAuthUser();

  const { data, error } = await supabase
    .from('players')
    .insert({ owner_id: user.id, user_id: null, name: trimmed })
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao criar o jogador: ${error.message}`);
  }
  return data;
}
