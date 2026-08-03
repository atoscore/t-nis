/*
 * Busca de usuários por nome de exibição. profiles.display_name já existe e
 * a RLS já permite leitura de qualquer perfil por qualquer autenticado —
 * nenhuma migration ou policy nova aqui.
 */

import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../types/supabase';

const SEARCH_LIMIT = 20;

export type ProfileSearchResult = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

/*
 * Busca parcial e case-insensitive por nome. Só seleciona id e
 * display_name — is_private e qualquer outro campo nunca saem daqui.
 */
export async function searchProfiles(query: string): Promise<ProfileSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Escapa curingas do ilike pra buscar o texto literal (mesmo padrão de searchCommunities).
  const pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', pattern)
    .order('display_name', { ascending: true })
    .limit(SEARCH_LIMIT);
  if (error) {
    throw new Error(`Falha ao buscar usuários: ${error.message}`);
  }
  return data;
}
