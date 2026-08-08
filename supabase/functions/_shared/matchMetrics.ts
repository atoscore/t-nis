/*
 * Monta o payload de métricas de uma partida (match_stats_summary +
 * get_head_to_head + get_player_radar_stats), reaproveitado por
 * functions/insights (devolve pro client) e functions/generate-match-insight
 * (vira o prompt do LLM). Extraído daqui pra não duplicar a lógica entre as
 * duas functions — ver README de supabase/functions/_shared se um dia
 * precisar virar pacote publicado; por ora é só import relativo, que é o
 * padrão de "shared code" do próprio Supabase pra Edge Functions.
 */

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface MatchMetricsSuccess {
  ok: true;
  metrics: Record<string, unknown>;
  playerId: string;
  opponentPlayerId: string | null;
}

export interface MatchMetricsFailure {
  ok: false;
  error: string;
  status: number;
}

export type MatchMetricsResult = MatchMetricsSuccess | MatchMetricsFailure;

export async function buildMatchMetrics(
  supabase: SupabaseLike,
  matchId: string
): Promise<MatchMetricsResult> {
  const { data: statsRow, error: statsError } = await supabase
    .from('match_stats_summary')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  if (statsError) {
    return {
      ok: false,
      error: `Falha ao carregar métricas da partida: ${statsError.message}`,
      status: 500,
    };
  }
  if (!statsRow) {
    return { ok: false, error: `Partida ${matchId} não encontrada.`, status: 404 };
  }

  const metrics: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(statsRow)) {
    if (key === 'match_id') continue;
    metrics[key] = value;
  }

  const { data: matchRow, error: matchError } = await supabase
    .from('matches')
    .select('player_id, opponent_player_id')
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) {
    return { ok: false, error: `Falha ao carregar a partida: ${matchError.message}`, status: 500 };
  }
  if (!matchRow?.player_id) {
    return { ok: false, error: `Partida ${matchId} não encontrada.`, status: 404 };
  }

  /*
   * head_to_head só entra em metrics quando o adversário também é um
   * player cadastrado: opponent_player_id é null para adversário avulso
   * (opponent_name), e get_head_to_head não tem o que comparar nesse caso.
   */
  if (matchRow.opponent_player_id) {
    const { data: h2hRows, error: h2hError } = await supabase.rpc('get_head_to_head', {
      player_a: matchRow.player_id,
      player_b: matchRow.opponent_player_id,
    });

    if (h2hError) {
      return {
        ok: false,
        error: `Falha ao carregar o head-to-head: ${h2hError.message}`,
        status: 500,
      };
    }

    const rows = h2hRows ?? [];
    const total = rows.length;
    const vitorias = rows.filter(
      (row: { vencedor_player_id: string }) => row.vencedor_player_id === matchRow.player_id
    ).length;

    metrics.head_to_head_partidas = total;
    metrics.head_to_head_vitorias = vitorias;
    metrics.head_to_head_derrotas = total - vitorias;
    metrics.head_to_head_pct_vitorias = total > 0 ? vitorias / total : null;
  }

  // Radar do player titular da partida — prefixo radar_ nas chaves, como o
  // README de functions/insights já previa antes de get_player_radar_stats existir.
  const { data: radarRows, error: radarError } = await supabase.rpc('get_player_radar_stats', {
    p_player_id: matchRow.player_id,
  });

  if (radarError) {
    return {
      ok: false,
      error: `Falha ao carregar o radar do jogador: ${radarError.message}`,
      status: 500,
    };
  }

  const radar = radarRows?.[0];
  if (radar) {
    for (const [key, value] of Object.entries(radar)) {
      metrics[`radar_${key}`] = value;
    }
  }

  return {
    ok: true,
    metrics,
    playerId: matchRow.player_id,
    opponentPlayerId: matchRow.opponent_player_id ?? null,
  };
}
