import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleGenerateInsight } from './index.ts';
import type { LlmAdapter } from './llmAdapters.ts';

const MATCH_ID = '11111111-1111-1111-1111-111111111111';
const PLAYER_ID = '22222222-2222-2222-2222-222222222222';

// deno-lint-ignore no-explicit-any
function buildFakeSupabase(opts: {
  existingInsight?: unknown;
  statsRow?: unknown;
  matchRow?: unknown;
  radarRows?: unknown[];
  upsertResult?: unknown;
}) {
  return {
    from(table: string) {
      if (table === 'match_insights') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: () => Promise.resolve({ data: opts.existingInsight ?? null, error: null }),
          upsert(_values: unknown, _upsertOpts: unknown) {
            return {
              select() {
                return this;
              },
              single: () => Promise.resolve({ data: opts.upsertResult ?? null, error: null }),
            };
          },
        };
      }
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
      throw new Error(`tabela inesperada no fake supabase: ${table}`);
    },
    rpc(name: string) {
      if (name === 'get_player_radar_stats') {
        return Promise.resolve({ data: opts.radarRows ?? [], error: null });
      }
      throw new Error(`rpc inesperada no fake supabase: ${name}`);
    },
  };
}

Deno.test('handleGenerateInsight: idempotente — não chama o LLM se já existe insight pro match_id', async () => {
  const supabase = buildFakeSupabase({ existingInsight: { match_id: MATCH_ID } });
  let called = false;
  const adapter: LlmAdapter = {
    generate: () => {
      called = true;
      return Promise.resolve({ text: 'x', model: 'x' });
    },
  };

  const result = await handleGenerateInsight(supabase, MATCH_ID, adapter);

  assertEquals(called, false);
  assertEquals(result.status, 200);
  assertEquals(result.body.skipped, true);
});

Deno.test('handleGenerateInsight: caminho feliz — gera e salva quando não existe insight ainda', async () => {
  const statsRow = { match_id: MATCH_ID, aces: 3 };
  const matchRow = { player_id: PLAYER_ID, opponent_player_id: null };
  const savedRow = { match_id: MATCH_ID, insight_text: 'análise gerada', provider: 'anthropic' };
  const supabase = buildFakeSupabase({
    existingInsight: null,
    statsRow,
    matchRow,
    radarRows: [{ saque: 0.7 }],
    upsertResult: savedRow,
  });

  let receivedPrompt = '';
  const adapter: LlmAdapter = {
    generate: (prompt: string) => {
      receivedPrompt = prompt;
      return Promise.resolve({ text: 'análise gerada', model: 'claude-haiku-4-5' });
    },
  };

  const result = await handleGenerateInsight(supabase, MATCH_ID, adapter);

  assertEquals(result.status, 200);
  assertEquals(result.body, savedRow);
  assertEquals(receivedPrompt.includes('aces'), true);
  assertEquals(receivedPrompt.includes('radar_saque'), true);
});
