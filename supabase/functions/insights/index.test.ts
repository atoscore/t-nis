import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleInsights } from './index.ts';

const MATCH_ID = '11111111-1111-1111-1111-111111111111';
const PLAYER_ID = '22222222-2222-2222-2222-222222222222';

function buildFakeSupabase(opts: {
  statsRow?: unknown;
  matchRow?: unknown;
  radarRows?: unknown[];
  h2hRows?: unknown[];
  insightRow?: unknown;
}) {
  return {
    from(table: string) {
      if (table === 'match_stats_summary') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: () => Promise.resolve({ data: opts.statsRow ?? null, error: null }),
        };
      }
      if (table === 'matches') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: () => Promise.resolve({ data: opts.matchRow ?? null, error: null }),
        };
      }
      if (table === 'match_insights') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: () => Promise.resolve({ data: opts.insightRow ?? null, error: null }),
        };
      }
      throw new Error(`tabela inesperada no fake supabase: ${table}`);
    },
    rpc(name: string) {
      if (name === 'get_head_to_head') {
        return Promise.resolve({ data: opts.h2hRows ?? [], error: null });
      }
      if (name === 'get_player_radar_stats') {
        return Promise.resolve({ data: opts.radarRows ?? [], error: null });
      }
      throw new Error(`rpc inesperada no fake supabase: ${name}`);
    },
  };
}

Deno.test('handleInsights: inclui radar_* prefixado e ai_insight null quando ainda não foi gerado', async () => {
  const supabase = buildFakeSupabase({
    statsRow: { match_id: MATCH_ID, aces: 3 },
    matchRow: { player_id: PLAYER_ID, opponent_player_id: null },
    radarRows: [{ saque: 0.7, devolucao: 0.5, forehand: 0.6, backhand: 0.4, fisico: 0.55, mental: 0.5 }],
    insightRow: null,
  });

  const result = await handleInsights(supabase, MATCH_ID);

  assertEquals(result.status, 200);
  assertEquals(result.body.match_id, MATCH_ID);
  assertEquals(result.body.ai_insight, null);
  const metrics = result.body.metrics as Record<string, unknown>;
  assertEquals(metrics.aces, 3);
  assertEquals(metrics.radar_saque, 0.7);
  assertEquals(metrics.radar_devolucao, 0.5);
});

Deno.test('handleInsights: ai_insight vem o texto quando já existe insight gerado', async () => {
  const supabase = buildFakeSupabase({
    statsRow: { match_id: MATCH_ID, aces: 3 },
    matchRow: { player_id: PLAYER_ID, opponent_player_id: null },
    radarRows: [],
    insightRow: { insight_text: 'Seu saque esteve consistente...' },
  });

  const result = await handleInsights(supabase, MATCH_ID);

  assertEquals(result.status, 200);
  assertEquals(result.body.ai_insight, 'Seu saque esteve consistente...');
});

Deno.test('handleInsights: head_to_head_* aparece quando há adversário cadastrado', async () => {
  const opponentId = '33333333-3333-3333-3333-333333333333';
  const supabase = buildFakeSupabase({
    statsRow: { match_id: MATCH_ID, aces: 1 },
    matchRow: { player_id: PLAYER_ID, opponent_player_id: opponentId },
    radarRows: [],
    h2hRows: [
      { vencedor_player_id: PLAYER_ID },
      { vencedor_player_id: opponentId },
    ],
    insightRow: null,
  });

  const result = await handleInsights(supabase, MATCH_ID);

  const metrics = result.body.metrics as Record<string, unknown>;
  assertEquals(metrics.head_to_head_partidas, 2);
  assertEquals(metrics.head_to_head_vitorias, 1);
  assertEquals(metrics.head_to_head_derrotas, 1);
  assertEquals(metrics.head_to_head_pct_vitorias, 0.5);
});
