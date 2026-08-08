import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { anthropicAdapter, getLlmAdapter, googleAdapter, openaiAdapter } from './llmAdapters.ts';

function stubFetch(
  handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response> | Response
) {
  const original = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  globalThis.fetch = handler as any;
  return () => {
    globalThis.fetch = original;
  };
}

Deno.test('anthropicAdapter.generate: monta a chamada certa e extrai o texto', async () => {
  Deno.env.set('ANTHROPIC_API_KEY', 'test-anthropic-key');
  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};
  let capturedBody: { model?: string } = {};
  const restore = stubFetch(async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = Object.fromEntries(new Headers(init?.headers).entries());
    capturedBody = JSON.parse(init?.body as string);
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'análise gerada' }] }), {
      status: 200,
    });
  });

  try {
    const result = await anthropicAdapter.generate('prompt de teste');
    assertEquals(result.text, 'análise gerada');
    assertEquals(result.model, 'claude-haiku-4-5');
    assertEquals(capturedUrl, 'https://api.anthropic.com/v1/messages');
    assertEquals(capturedHeaders['x-api-key'], 'test-anthropic-key');
    assertEquals(capturedHeaders['anthropic-version'], '2023-06-01');
    assertEquals(capturedBody.model, 'claude-haiku-4-5');
  } finally {
    restore();
    Deno.env.delete('ANTHROPIC_API_KEY');
  }
});

Deno.test('anthropicAdapter.generate: usa ANTHROPIC_MODEL quando setado', async () => {
  Deno.env.set('ANTHROPIC_API_KEY', 'test-key');
  Deno.env.set('ANTHROPIC_MODEL', 'claude-opus-5');
  const restore = stubFetch(
    () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), { status: 200 })
  );
  try {
    const result = await anthropicAdapter.generate('prompt');
    assertEquals(result.model, 'claude-opus-5');
  } finally {
    restore();
    Deno.env.delete('ANTHROPIC_API_KEY');
    Deno.env.delete('ANTHROPIC_MODEL');
  }
});

Deno.test('openaiAdapter.generate: erro claro quando falta OPENAI_API_KEY', async () => {
  Deno.env.delete('OPENAI_API_KEY');
  Deno.env.delete('OPENAI_MODEL');
  await assertRejects(() => openaiAdapter.generate('prompt'), Error, 'OPENAI_API_KEY');
});

Deno.test('openaiAdapter.generate: erro claro quando falta OPENAI_MODEL (sem default)', async () => {
  Deno.env.set('OPENAI_API_KEY', 'test-key');
  Deno.env.delete('OPENAI_MODEL');
  try {
    await assertRejects(() => openaiAdapter.generate('prompt'), Error, 'OPENAI_MODEL');
  } finally {
    Deno.env.delete('OPENAI_API_KEY');
  }
});

Deno.test('openaiAdapter.generate: monta a chamada certa e extrai o texto', async () => {
  Deno.env.set('OPENAI_API_KEY', 'test-key');
  Deno.env.set('OPENAI_MODEL', 'gpt-4o');
  let capturedUrl = '';
  let capturedAuth = '';
  const restore = stubFetch(async (input, init) => {
    capturedUrl = String(input);
    capturedAuth = new Headers(init?.headers).get('authorization') ?? '';
    return new Response(JSON.stringify({ choices: [{ message: { content: 'resposta openai' } }] }), {
      status: 200,
    });
  });
  try {
    const result = await openaiAdapter.generate('prompt');
    assertEquals(result.text, 'resposta openai');
    assertEquals(result.model, 'gpt-4o');
    assertEquals(capturedUrl, 'https://api.openai.com/v1/chat/completions');
    assertEquals(capturedAuth, 'Bearer test-key');
  } finally {
    restore();
    Deno.env.delete('OPENAI_API_KEY');
    Deno.env.delete('OPENAI_MODEL');
  }
});

Deno.test('googleAdapter.generate: erro claro quando falta GOOGLE_API_KEY', async () => {
  Deno.env.delete('GOOGLE_API_KEY');
  Deno.env.delete('GOOGLE_MODEL');
  await assertRejects(() => googleAdapter.generate('prompt'), Error, 'GOOGLE_API_KEY');
});

Deno.test('googleAdapter.generate: erro claro quando falta GOOGLE_MODEL (sem default)', async () => {
  Deno.env.set('GOOGLE_API_KEY', 'test-key');
  Deno.env.delete('GOOGLE_MODEL');
  try {
    await assertRejects(() => googleAdapter.generate('prompt'), Error, 'GOOGLE_MODEL');
  } finally {
    Deno.env.delete('GOOGLE_API_KEY');
  }
});

Deno.test('googleAdapter.generate: monta a chamada certa e extrai o texto', async () => {
  Deno.env.set('GOOGLE_API_KEY', 'test-key');
  Deno.env.set('GOOGLE_MODEL', 'gemini-2.0-flash');
  let capturedUrl = '';
  const restore = stubFetch(async (input) => {
    capturedUrl = String(input);
    return new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: 'resposta google' }] } }] }),
      { status: 200 }
    );
  });
  try {
    const result = await googleAdapter.generate('prompt');
    assertEquals(result.text, 'resposta google');
    assertEquals(result.model, 'gemini-2.0-flash');
    assertStringIncludes(capturedUrl, 'models/gemini-2.0-flash:generateContent?key=test-key');
  } finally {
    restore();
    Deno.env.delete('GOOGLE_API_KEY');
    Deno.env.delete('GOOGLE_MODEL');
  }
});

Deno.test('getLlmAdapter: default é anthropic', () => {
  Deno.env.delete('INSIGHTS_LLM_PROVIDER');
  assertEquals(getLlmAdapter(), anthropicAdapter);
});

Deno.test('getLlmAdapter: escolhe openai/google via env var', () => {
  Deno.env.set('INSIGHTS_LLM_PROVIDER', 'openai');
  assertEquals(getLlmAdapter(), openaiAdapter);
  Deno.env.set('INSIGHTS_LLM_PROVIDER', 'google');
  assertEquals(getLlmAdapter(), googleAdapter);
  Deno.env.delete('INSIGHTS_LLM_PROVIDER');
});

Deno.test('getLlmAdapter: erro claro pra provider desconhecido', () => {
  Deno.env.set('INSIGHTS_LLM_PROVIDER', 'bogus');
  try {
    let threw = false;
    try {
      getLlmAdapter();
    } catch (err) {
      threw = true;
      assertStringIncludes((err as Error).message, 'bogus');
    }
    assertEquals(threw, true);
  } finally {
    Deno.env.delete('INSIGHTS_LLM_PROVIDER');
  }
});
