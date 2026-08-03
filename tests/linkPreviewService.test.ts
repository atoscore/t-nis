import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLinkPreview } from '../src/services/linkPreviewService';

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

function htmlResponse(html: string, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(html),
  } as Response;
}

describe('getLinkPreview', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa o oEmbed do YouTube para links youtube.com/watch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        title: 'Rick Astley - Never Gonna Give You Up',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        author_name: 'Rick Astley',
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const preview = await getLinkPreview(url);

    expect(preview).toEqual({
      title: 'Rick Astley - Never Gonna Give You Up',
      imageUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      description: 'Rick Astley',
      source: 'youtube',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toBe(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
  });

  it('reconhece links curtos youtu.be como YouTube', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ title: 'Título', thumbnail_url: 'https://img/x.jpg', author_name: 'Autor' })
    );
    vi.stubGlobal('fetch', fetchMock);

    const preview = await getLinkPreview('https://youtu.be/dQw4w9WgXcQ');

    expect(preview.source).toBe('youtube');
    expect(preview.title).toBe('Título');
  });

  it('extrai as meta tags Open Graph de um link genérico', async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Notícia importante">
        <meta content="https://cdn.example.com/capa.jpg" property="og:image">
        <meta property="og:description" content="Resumo &amp; detalhes da notícia">
      </head></html>
    `;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse(html)));

    const preview = await getLinkPreview('https://noticias.example.com/materia');

    expect(preview).toEqual({
      title: 'Notícia importante',
      imageUrl: 'https://cdn.example.com/capa.jpg',
      description: 'Resumo & detalhes da notícia',
      source: 'generic',
    });
  });

  it('retorna preview vazio (sem lançar) quando o fetch rejeita, ex.: timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));

    const preview = await getLinkPreview('https://lento.example.com/pagina');

    expect(preview).toEqual({
      title: null,
      imageUrl: null,
      description: null,
      source: 'generic',
    });
  });

  it('retorna preview vazio quando a resposta é 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(htmlResponse('not found', { ok: false, status: 404 })));

    const preview = await getLinkPreview('https://exemplo.com/pagina-inexistente');

    expect(preview.title).toBeNull();
    expect(preview.imageUrl).toBeNull();
    expect(preview.description).toBeNull();
    expect(preview.source).toBe('generic');
  });

  it('retorna preview vazio quando a página não tem meta tags OG (bloqueio de scraper)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(htmlResponse('<html><body>Acesso bloqueado</body></html>'))
    );

    const preview = await getLinkPreview('https://paywall.example.com/materia');

    expect(preview).toEqual({
      title: null,
      imageUrl: null,
      description: null,
      source: 'generic',
    });
  });
});
