import type { VercelRequest, VercelResponse } from '@vercel/node';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function extractOgImage(html: string): string | null {
  return (
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
    null
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache thumbnails for 24 hours — they almost never change
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  const url = (req.query.url as string | undefined) ?? '';
  if (!url.startsWith('http')) return res.json({ image: null });

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) return res.json({ image: null });

    const text = await r.text();
    // og:image is always in <head> — slice to avoid parsing megabytes of body
    const headEnd = text.indexOf('</head>');
    const head    = headEnd > 0 ? text.slice(0, headEnd + 7) : text.slice(0, 32768);

    return res.json({ image: extractOgImage(head) });
  } catch {
    return res.json({ image: null });
  }
}
