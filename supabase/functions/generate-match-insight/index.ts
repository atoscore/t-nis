/*
 * Recebe { match_id } via POST (chamada só pelo trigger
 * matches_trigger_ai_insight via pg_net, nunca por um browser — service
 * role, sem JWT de usuário). Busca métricas (match_stats_summary +
 * head_to_head + radar, via functions/_shared/matchMetrics.ts), gera uma
 * análise curta via LLM e grava em match_insights.
 *
 * Idempotente: se já existe linha para o match_id, não chama o LLM de novo
 * (evita gasto duplicado se o trigger disparar mais de uma vez).
 *
 * `handleGenerateInsight` é exportado separado do `Deno.serve` pra dar pra
 * testar sem precisar subir um servidor HTTP de verdade.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildMatchMetrics } from '../_shared/matchMetrics.ts';
import { getLlmAdapter, type LlmAdapter } from './llmAdapters.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPrompt(metrics: Record<string, unknown>): string {
  return `Você é um treinador de tênis experiente e direto. Com base SOMENTE nos dados abaixo — não invente nenhuma estatística que não esteja aqui — escreva uma análise curta em português (2 a 3 parágrafos) sobre o desempenho do jogador nesta partida, cobrindo:

1. Um ponto forte, baseado nos dados.
2. Um ponto a melhorar, priorizando o atributo mais baixo entre os do radar (saque, devolução, forehand, backhand, físico, mental) quando disponível nos dados.
3. Como o histórico de confronto direto contra este adversário (quando existir nos dados) se encaixa na análise.

Dados da partida (JSON):
${JSON.stringify(metrics, null, 2)}`;
}

export interface GenerateInsightResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleGenerateInsight(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  matchId: string,
  adapter: LlmAdapter
): Promise<GenerateInsightResult> {
  const { data: existing, error: existingError } = await supabase
    .from('match_insights')
    .select('match_id')
    .eq('match_id', matchId)
    .maybeSingle();
  if (existingError) {
    return {
      status: 500,
      body: { error: `Falha ao verificar insight existente: ${existingError.message}` },
    };
  }
  if (existing) {
    return {
      status: 200,
      body: { match_id: matchId, skipped: true, reason: 'já existe insight gerado para esta partida' },
    };
  }

  const metricsResult = await buildMatchMetrics(supabase, matchId);
  if (!metricsResult.ok) {
    return { status: metricsResult.status, body: { error: metricsResult.error } };
  }

  const prompt = buildPrompt(metricsResult.metrics);

  let generated;
  try {
    generated = await adapter.generate(prompt);
  } catch (cause) {
    return { status: 502, body: { error: `Falha ao gerar o insight: ${(cause as Error).message}` } };
  }

  const { data: saved, error: saveError } = await supabase
    .from('match_insights')
    .upsert(
      {
        match_id: matchId,
        provider: Deno.env.get('INSIGHTS_LLM_PROVIDER') ?? 'anthropic',
        model: generated.model,
        insight_text: generated.text,
        metrics_snapshot: metricsResult.metrics,
      },
      { onConflict: 'match_id' }
    )
    .select()
    .single();
  if (saveError) {
    return { status: 500, body: { error: `Falha ao salvar o insight: ${saveError.message}` } };
  }

  return { status: 200, body: saved };
}

if (import.meta.main) {
  Deno.serve(async (req) => {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método não suportado.' }, 405);
    }

    let matchId: string | undefined;
    try {
      const body = await req.json();
      matchId = body?.match_id;
    } catch {
      return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400);
    }
    if (!matchId) {
      return jsonResponse({ error: 'match_id é obrigatório.' }, 400);
    }

    // service role: chamada vem do banco (pg_net), não tem JWT de usuário.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let adapter: LlmAdapter;
    try {
      adapter = getLlmAdapter();
    } catch (cause) {
      return jsonResponse({ error: (cause as Error).message }, 500);
    }

    const result = await handleGenerateInsight(supabase, matchId, adapter);
    return jsonResponse(result.body, result.status);
  });
}
