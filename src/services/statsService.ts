import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../types/supabase';

export type MatchStatsSummaryRow = Tables<'match_stats_summary'>;

/**
 * Carrega o resumo já agregado pelo banco para uma única partida.
 *
 * Nenhuma estatística é recalculada nesta camada: a fonte de verdade é a view
 * public.match_stats_summary.
 */
export async function getMatchStats(
  matchId: string
): Promise<MatchStatsSummaryRow> {
  if (!matchId) {
    throw new Error('matchId é obrigatório para carregar as estatísticas.');
  }

  const { data, error } = await supabase
    .from('match_stats_summary')
    .select('*')
    .eq('match_id', matchId)
    .single();

  if (error) {
    throw new Error(
      `Falha ao carregar as estatísticas da partida ${matchId}: ${error.message}`
    );
  }

  return data;
}
