/*
 * Edge Function de insights: consolida, para uma partida, as métricas já
 * disponíveis hoje no banco (view public.match_stats_summary, RPC
 * public.get_head_to_head e RPC public.get_player_radar_stats — via
 * functions/_shared/matchMetrics.ts, compartilhado com
 * functions/generate-match-insight) mais o texto de IA já gerado para essa
 * partida (public.match_insights), quando existir.
 *
 * `metrics` é deliberadamente um objeto chave-valor extensível, não um
 * schema fixo com campos nomeados no contrato da função: as chaves vêm de
 * um `select('*')` sobre match_stats_summary (mais radar_* e head_to_head_*
 * adicionadas por buildMatchMetrics). Colunas novas na view aparecem
 * automaticamente em `metrics`, sem alterar este arquivo. Ver README.md
 * deste diretório.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildMatchMetrics } from '../_shared/matchMetrics.ts';

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

export interface InsightsResult {
  status: number;
  body: Record<string, unknown>;
}

/*
 * `handleInsights` é exportado separado do `Deno.serve` pra dar pra testar
 * sem precisar subir um servidor HTTP de verdade (mesmo padrão de
 * functions/generate-match-insight).
 */
export async function handleInsights(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  matchId: string
): Promise<InsightsResult> {
  const metricsResult = await buildMatchMetrics(supabase, matchId);
  if (!metricsResult.ok) {
    return { status: metricsResult.status, body: { error: metricsResult.error } };
  }

  /*
   * ai_insight vem null, não erro, quando ainda não foi gerado — a partida
   * pode não ter completado, ou o job (trigger -> generate-match-insight)
   * pode não ter rodado ainda. É estado esperado, não falha.
   */
  const { data: insightRow, error: insightError } = await supabase
    .from('match_insights')
    .select('insight_text')
    .eq('match_id', matchId)
    .maybeSingle();
  if (insightError) {
    return {
      status: 500,
      body: { error: `Falha ao carregar o insight de IA: ${insightError.message}` },
    };
  }

  return {
    status: 200,
    body: {
      match_id: matchId,
      generated_at: new Date().toISOString(),
      metrics: metricsResult.metrics,
      ai_insight: insightRow?.insight_text ?? null,
    },
  };
}

if (import.meta.main) {
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
     * que a RLS de matches/sets/stat_events/match_insights continue
     * valendo — mesma postura de get_head_to_head, que é SECURITY INVOKER
     * por conter dados de partidas de terceiros.
     */
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const result = await handleInsights(supabase, matchId);
    return jsonResponse(result.body, result.status);
  });
}
