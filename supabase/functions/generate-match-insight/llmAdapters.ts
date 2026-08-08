/*
 * Adaptador de provedor de LLM. Formatos de request/response conferidos
 * contra a documentação atual de cada API antes de escrever (Anthropic
 * Messages API, OpenAI Chat Completions, Google Generative Language API) —
 * não chutados.
 */

export interface LlmAdapter {
  generate(prompt: string): Promise<{ text: string; model: string }>;
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`);
  }
  return value;
}

export const anthropicAdapter: LlmAdapter = {
  async generate(prompt) {
    const apiKey = requireEnv('ANTHROPIC_API_KEY');
    const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API respondeu ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    const textBlock = (json.content ?? []).find(
      (block: { type: string }) => block.type === 'text'
    );
    if (!textBlock || typeof textBlock.text !== 'string') {
      throw new Error('Resposta da Anthropic API sem bloco de texto.');
    }
    return { text: textBlock.text, model };
  },
};

export const openaiAdapter: LlmAdapter = {
  async generate(prompt) {
    const apiKey = requireEnv('OPENAI_API_KEY');
    const model = requireEnv('OPENAI_MODEL');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API respondeu ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      throw new Error('Resposta da OpenAI API sem texto.');
    }
    return { text, model };
  },
};

export const googleAdapter: LlmAdapter = {
  async generate(prompt) {
    const apiKey = requireEnv('GOOGLE_API_KEY');
    const model = requireEnv('GOOGLE_MODEL');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google API respondeu ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error('Resposta da Google API sem texto.');
    }
    return { text, model };
  },
};

// INSIGHTS_LLM_PROVIDER seleciona o adapter; default 'anthropic'. Erro claro
// se o provider for desconhecido — nunca cai silenciosamente num default.
export function getLlmAdapter(): LlmAdapter {
  const provider = Deno.env.get('INSIGHTS_LLM_PROVIDER') ?? 'anthropic';
  switch (provider) {
    case 'anthropic':
      return anthropicAdapter;
    case 'openai':
      return openaiAdapter;
    case 'google':
      return googleAdapter;
    default:
      throw new Error(`Provedor de LLM desconhecido: ${provider}`);
  }
}
