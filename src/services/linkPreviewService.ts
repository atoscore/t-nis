/*
 * Preview de link, isolado: só faz fetch e parse, sem tocar em
 * Supabase/Edge Function/DB. Quem chama (client ou uma Edge Function futura)
 * decide onde plugar isso.
 */

export type LinkPreviewSource = 'youtube' | 'generic';

export interface LinkPreview {
  title: string | null;
  imageUrl: string | null;
  description: string | null;
  source: LinkPreviewSource;
}

const FETCH_TIMEOUT_MS = 5000;

function emptyPreview(source: LinkPreviewSource): LinkPreview {
  return { title: null, imageUrl: null, description: null, source };
}

function detectSource(url: string): LinkPreviewSource {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') return 'youtube';
    if (host === 'youtube.com' && pathname === '/watch') return 'youtube';
    return 'generic';
  } catch {
    return 'generic';
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

interface YouTubeOEmbedResponse {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
}

/* description vem de author_name: o oEmbed não traz descrição do vídeo. */
async function fetchYouTubePreview(url: string): Promise<LinkPreview> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const response = await fetchWithTimeout(oembedUrl);
  if (!response.ok) return emptyPreview('youtube');

  const data = (await response.json()) as YouTubeOEmbedResponse;
  return {
    title: data.title ?? null,
    imageUrl: data.thumbnail_url ?? null,
    description: data.author_name ?? null,
    source: 'youtube',
  };
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const codePoint = entity[1]?.toLowerCase() === 'x'
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return HTML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/*
 * Extrai o content de uma meta tag Open Graph via regex (sem DOMParser: o
 * serviço roda tanto em browser quanto em runtimes sem DOM, ex.: uma futura
 * Edge Function). Aceita property/content em qualquer ordem de atributos.
 */
function extractOgContent(html: string, property: string): string | null {
  const propFirst = new RegExp(
    `<meta[^>]*\\bproperty=["']${property}["'][^>]*\\bcontent=["']([^"']*)["']`,
    'i'
  );
  const contentFirst = new RegExp(
    `<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bproperty=["']${property}["']`,
    'i'
  );
  const match = propFirst.exec(html) ?? contentFirst.exec(html);
  if (!match?.[1]) return null;
  const decoded = decodeHtmlEntities(match[1]).trim();
  return decoded || null;
}

async function fetchGenericPreview(url: string): Promise<LinkPreview> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) return emptyPreview('generic');

  const html = await response.text();
  return {
    title: extractOgContent(html, 'og:title'),
    imageUrl: extractOgContent(html, 'og:image'),
    description: extractOgContent(html, 'og:description'),
    source: 'generic',
  };
}

/*
 * Preview de um link para YouTube (oEmbed) ou genérico (Open Graph).
 * Nunca lança: timeout, 404 ou HTML sem OG tags viram preview vazio, já que
 * link de notícia às vezes bloqueia scraper.
 */
export async function getLinkPreview(url: string): Promise<LinkPreview> {
  const source = detectSource(url);
  try {
    return source === 'youtube'
      ? await fetchYouTubePreview(url)
      : await fetchGenericPreview(url);
  } catch {
    return emptyPreview(source);
  }
}
