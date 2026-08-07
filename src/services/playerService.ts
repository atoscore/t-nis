import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../types/supabase';

export type PlayerRow = Tables<'players'>;

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
