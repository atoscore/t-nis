/*
 * Edge Function de insights: consolida, para uma partida, as métricas já
 * disponíveis hoje no banco (view public.match_stats_summary e RPC
 * public.get_head_to_head) em um único payload.
 *
 * `metrics` é deliberadamente um objeto chave-valor extensível, não um
 * schema fixo com campos nomeados no contrato da função: as chaves vêm de
 * um `select('*')` sobre match_stats_summary, então quando a branch
 * backend/saque-radar mergear (colunas novas na view e/ou
 * get_player_radar_stats para o radar chart) essas chaves passam a
 * aparecer sozinhas em `metrics`, sem exigir uma nova versão deste
 * endpoint nem quebrar quem já consome as chaves atuais. Ver
 * README.md deste diretório.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const matchId = url.searchParams.get('match_id');
  if (!matchId) {
    return jsonResponse({ error: 'match_id é obrigatório.' }, 400);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Authorization é obrigatório.' }, 401);
  }

  /*
   * O client é criado com o JWT de quem chamou (não a service role), para
   * que a RLS de matches/sets/stat_events continue valendo — mesma postura
   * de get_head_to_head, que é SECURITY INVOKER por conter dados de
   * partidas de terceiros.
   */
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: statsRow, error: statsError } = await supabase
    .from('match_stats_summary')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  if (statsError) {
    return jsonResponse(
      { error: `Falha ao carregar métricas da partida: ${statsError.message}` },
      500
    );
  }
  if (!statsRow) {
    return jsonResponse({ error: `Partida ${matchId} não encontrada.` }, 404);
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
    return jsonResponse(
      { error: `Falha ao carregar a partida: ${matchError.message}` },
      500
    );
  }

  /*
   * head_to_head só entra em metrics quando o adversário também é um
   * player cadastrado: opponent_player_id é null para adversário avulso
   * (opponent_name), e get_head_to_head não tem o que comparar nesse caso.
   */
  if (matchRow?.player_id && matchRow.opponent_player_id) {
    const { data: h2hRows, error: h2hError } = await supabase.rpc(
      'get_head_to_head',
      {
        player_a: matchRow.player_id,
        player_b: matchRow.opponent_player_id,
      }
    );

    if (h2hError) {
      return jsonResponse(
        { error: `Falha ao carregar o head-to-head: ${h2hError.message}` },
        500
      );
    }

    const rows = h2hRows ?? [];
    const total = rows.length;
    const vitorias = rows.filter(
      (row) => row.vencedor_player_id === matchRow.player_id
    ).length;

    metrics.head_to_head_partidas = total;
    metrics.head_to_head_vitorias = vitorias;
    metrics.head_to_head_derrotas = total - vitorias;
    metrics.head_to_head_pct_vitorias = total > 0 ? vitorias / total : null;
  }

  return jsonResponse({
    match_id: matchId,
    generated_at: new Date().toISOString(),
    metrics,
  });
});
