import type { VercelRequest, VercelResponse } from '@vercel/node';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ── HTML → clean text ──────────────────────────────────────── */

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, ' ');
}

function htmlToText(html: string): string {
  return html
    // Block-level elements → newline (opening and closing)
    .replace(/<\/?(p|li|dt|dd|h[1-6]|blockquote|pre|tr)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode entities
    .split('').join('') // break string interning before replace
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')
    // Clean whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Article extraction ─────────────────────────────────────── */

function extractArticle(html: string): { text: string; image?: string } {
  // og:image — best thumbnail source
  const image =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

  // Strip noise that's never article content
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Try article containers from most to least specific
  const selectors: RegExp[] = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    // Common WordPress / news-site content class names
    /<div[^>]+class="[^"]*\b(?:entry-content|post-content|article-content|article-body|content-body|story-body|post-body|td-post-content|single-content|newsarticle|news-content)\b[^"]*"[^>]*>([\s\S]*?)<\/div\s*>/i,
    /<section[^>]+class="[^"]*\b(?:article|content|post|entry)\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const rx of selectors) {
    const m = clean.match(rx);
    if (m?.[1] && m[1].replace(/<[^>]+>/g, '').trim().length > 200) {
      return { text: htmlToText(m[1]).slice(0, 8000), image };
    }
  }

  // Last resort: full-page text (removes nav/header/footer already stripped above)
  return { text: htmlToText(clean).slice(0, 8000), image };
}

/* ── Handler ────────────────────────────────────────────────── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache article content for 1 hour — articles don't change after publish
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  const url = (req.query.url as string | undefined) ?? '';
  if (!url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return res.status(r.status).json({ error: `Upstream returned ${r.status}` });

    const html = await r.text();
    const result = extractArticle(html);

    if (!result.text || result.text.length < 80) {
      return res.status(422).json({ error: 'Could not extract article content' });
    }

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
}
