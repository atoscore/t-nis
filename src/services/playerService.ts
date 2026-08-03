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

export async function createPlayer(name: string): Promise<PlayerRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('O nome do jogador é obrigatório.');

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error('Usuário não autenticado: faça login antes de criar um jogador.');
  }

  const { data, error } = await supabase
    .from('players')
    .insert({ owner_id: auth.user.id, user_id: auth.user.id, name: trimmed })
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao criar o jogador: ${error.message}`);
  }
  return data;
}
