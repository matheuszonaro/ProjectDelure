import type { VercelRequest, VercelResponse } from '@vercel/node';
import { XMLParser } from 'fast-xml-parser';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ── Shared item shape ──────────────────────────────────────── */
interface NewsItemServer {
  id: string; title: string; description: string;
  fullDescription: string; link: string; pubDate: string;
  thumbnail?: string; source: string;
}

/* ── RSS sources ────────────────────────────────────────────── */
const SOURCES = [
  { name: 'Nintendo Life',    url: 'https://www.nintendolife.com/feeds/latest'             },
  { name: 'My Nintendo News', url: 'https://mynintendonews.com/feed/'                      },
  { name: 'Gematsu',          url: 'https://gematsu.com/category/nintendo/feed'            },
  { name: 'Vooks',            url: 'https://www.vooks.net/feed/'                           },
  { name: 'GoNintendo',       url: 'https://gonintendo.com/feed'                           },
  { name: 'Siliconera',       url: 'https://www.siliconera.com/category/nintendo/feed/'    },
  { name: 'Nintendo Insider', url: 'https://www.nintendo-insider.com/feed/'                              },
  { name: 'Nintendo Blast',   url: 'https://www.nintendoblast.com.br/feeds/posts/default?alt=rss'   },
  { name: 'Universo Nintendo',url: 'https://universonintendo.com/feed/'                    },
];

/* ── Sitemap-based sources (no RSS available) ───────────────── */
const SITEMAP_SOURCES = [
  {
    name:     'Coelho News',
    sitemap:  'https://coelhonews.com/sitemap-noticias-rss.xml',
    filter:   (u: string) => u.includes('/noticias/'),
    sortable: true,   // has distinct <lastmod> per article
  },
  {
    name:     'CanalDigplay',
    sitemap:  'https://www.canaldigplay.com/sitemap.xml',
    filter:   (u: string) => {
      const slug = u.replace('https://www.canaldigplay.com/', '').replace(/\/$/, '');
      const STATIC = new Set(['home','sobredigplay','digawards','digawardsvota','digofertas']);
      return slug.length > 10 && !STATIC.has(slug) && !slug.includes('/');
    },
    sortable: false,  // all entries share same <lastmod> — rely on sitemap order (newest first)
  },
];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  allowBooleanAttributes: true,
  trimValues: true,
});

/* ── Helpers ────────────────────────────────────────────────── */

function pagedUrl(base: string, page: number): string {
  if (page <= 1) return base;
  return base + (base.includes('?') ? '&' : '?') + `paged=${page}`;
}

/** Safely extract string from a parsed XML value (CDATA, plain, or attribute). */
function str(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    return String(o['__cdata'] ?? o['#text'] ?? o['@_href'] ?? '');
  }
  return String(v);
}

function stripHtml(s: string, max = 99999): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
    .slice(0, max);
}

function pickUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v || undefined;
  if (Array.isArray(v)) {
    for (const item of v) {
      const u = pickUrl(item);
      if (u) return u;
    }
    return undefined;
  }
  const o = v as Record<string, unknown>;
  const url = o['@_url'] ?? o['url'];
  return typeof url === 'string' && url ? url : undefined;
}

function extractThumbnail(it: Record<string, unknown>): string | undefined {
  // 1. media:content / media:thumbnail (handles objects, arrays, and nested)
  for (const key of ['media:content', 'media:thumbnail']) {
    const u = pickUrl(it[key]);
    if (u) return u;
  }

  // 2. enclosure (any type — many podcasts/sites use it for images)
  const enc = it['enclosure'];
  if (enc) {
    const u = pickUrl(enc);
    if (u) return u;
  }

  // 3. img tag inside HTML fields — decode entities first so both CDATA and
  //    entity-encoded descriptions are handled uniformly
  for (const field of ['content:encoded', 'content', 'description', 'summary']) {
    const raw = str(it[field] ?? '');
    if (!raw) continue;
    const decoded = raw
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    const m = decoded.match(/<img[^>]+src=["']([^"']+(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i)
            ?? decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m?.[1]) return m[1];
  }

  return undefined;
}

/** Extract link from item: handles RSS text link, Atom link[@href], and arrays of links. */
function extractLink(it: Record<string, unknown>, fallbackId: string): string {
  const raw = it.link;
  if (!raw) return str(it.guid ?? it.id) || fallbackId;

  if (typeof raw === 'string') return raw;

  if (Array.isArray(raw)) {
    // Atom: array of <link> elements — prefer rel="alternate"
    const links = raw as Record<string, unknown>[];
    const alt = links.find(l => l['@_rel'] === 'alternate') ?? links.find(l => l['@_href']) ?? links[0];
    return str(alt?.['@_href'] ?? alt) || fallbackId;
  }

  if (typeof raw === 'object' && raw !== null) {
    const lo = raw as Record<string, unknown>;
    // Atom single <link href="..."/>
    if (lo['@_href']) return String(lo['@_href']);
    // RSS <link>text</link>
    return str(lo['__cdata'] ?? lo['#text'] ?? lo) || fallbackId;
  }

  return fallbackId;
}

function parseItems(xml: string, sourceName: string): NewsItemServer[] {
  try {
    const parsed = xmlParser.parse(xml);
    const channel = parsed.rss?.channel ?? parsed.feed ?? {};
    const raw     = channel.item ?? channel.entry ?? [];
    const items: unknown[] = Array.isArray(raw) ? raw : [raw];

    return items.map((item: unknown, i: number) => {
      const it = item as Record<string, unknown>;

      const title   = stripHtml(str(it.title), 200);
      const link    = extractLink(it, `${sourceName}-${i}`);
      const pubDate = str(it.pubDate ?? it.published ?? it.updated) || new Date().toISOString();

      const rawDesc        = str(it.description ?? it.summary ?? '');
      const contentEncoded = str(it['content:encoded'] ?? it.content ?? '');
      const fullRaw        = contentEncoded || rawDesc;

      return {
        id:              str(it.guid ?? it.id) || `${sourceName}-${i}`,
        title,
        description:     stripHtml(rawDesc, 260),
        fullDescription: stripHtml(fullRaw, 3000),
        link,
        pubDate,
        thumbnail:       extractThumbnail(it),
        source:          sourceName,
      };
    }).filter(item => item.title && item.link);
  } catch {
    return [];
  }
}

/* ── Sitemap scraper helpers ────────────────────────────────── */

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function extractOgMeta(html: string, prop: string): string | null {
  return html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'))?.[1]
    ?? null;
}

/**
 * Fetch articles from a site that has no RSS feed by:
 *   1. Downloading its sitemap XML
 *   2. Extracting article URLs (filtered + ordered)
 *   3. Fetching each article's <head> in parallel for og: metadata
 */
async function fetchFromSitemap(
  sitemapUrl: string,
  sourceName: string,
  limit: number,
  urlFilter: (url: string) => boolean,
  sortByDate: boolean,
): Promise<NewsItemServer[]> {
  try {
    const sRes = await fetch(sitemapUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    if (!sRes.ok) return [];
    const xml = await sRes.text();

    const urls: { loc: string; lastmod: string }[] = [];
    const blockRe = /<url>([\s\S]*?)<\/url>/gi;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(xml)) !== null) {
      const block  = bm[1];
      const loc    = block.match(/<loc>\s*([^\s<]+)\s*<\/loc>/i)?.[1]?.trim();
      const lastmod = block.match(/<lastmod>\s*([^\s<]+)\s*<\/lastmod>/i)?.[1]?.trim() ?? '';
      if (loc && urlFilter(loc)) urls.push({ loc, lastmod });
      if (urls.length >= 60) break; // enough candidates
    }

    // Only sort when dates are meaningful (CoelhoNews); for CanalDigplay keep sitemap order
    if (sortByDate) urls.sort((a, b) => b.lastmod.localeCompare(a.lastmod));

    const recent = urls.slice(0, limit);

    const items = await Promise.all(recent.map(async ({ loc, lastmod }) => {
      try {
        const r = await fetch(loc, {
          headers: { 'User-Agent': UA, 'Accept': 'text/html' },
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) return null;
        const text    = await r.text();
        const headEnd = text.indexOf('</head>');
        const head    = headEnd > 0 ? text.slice(0, headEnd + 7) : text.slice(0, 32768);

        const slug     = loc.split('/').filter(Boolean).pop() ?? '';
        const ogTitle  = extractOgMeta(head, 'og:title')
                      ?? head.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
                      ?? slugToTitle(slug);
        const ogDesc   = extractOgMeta(head, 'og:description')
                      ?? head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
                      ?? '';
        const ogImage  = extractOgMeta(head, 'og:image') ?? undefined;
        const pubRaw   = extractOgMeta(head, 'article:published_time');
        const pubDate  = pubRaw
          ? new Date(pubRaw).toUTCString()
          : lastmod ? new Date(lastmod).toUTCString() : new Date().toUTCString();

        const title = stripHtml(ogTitle, 200);
        if (!title) return null;

        return {
          id:              `${sourceName.toLowerCase().replace(/\s+/g, '-')}-${slug.slice(0, 30)}`,
          title,
          description:     stripHtml(ogDesc, 260),
          fullDescription: stripHtml(ogDesc, 3000),
          link:            loc,
          pubDate,
          thumbnail:       ogImage,
          source:          sourceName,
        } satisfies NewsItemServer;
      } catch { return null; }
    }));

    return items.filter((i): i is NewsItemServer => i !== null);
  } catch { return []; }
}

/* ── Handler ────────────────────────────────────────────────── */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const page = Math.max(1, Number((req.query.page as string) ?? '1'));

  try {
    // Standard RSS — support pagination
    const rssResults = await Promise.allSettled(
      SOURCES.map(async src => {
        const url = pagedUrl(src.url, page);
        try {
          const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
          if (!r.ok) return [] as NewsItemServer[];
          return parseItems(await r.text(), src.name);
        } catch { return [] as NewsItemServer[]; }
      })
    );

    // Sitemap scrapers — only on page 1 (no meaningful pagination for sitemaps)
    const sitemapResults = page === 1
      ? await Promise.allSettled(
          SITEMAP_SOURCES.map(src =>
            fetchFromSitemap(src.sitemap, src.name, 8, src.filter, src.sortable)
          )
        )
      : [];

    const seen = new Set<string>();
    const all: NewsItemServer[] = [
      ...rssResults
        .filter((r): r is PromiseFulfilledResult<NewsItemServer[]> => r.status === 'fulfilled')
        .flatMap(r => r.value),
      ...sitemapResults
        .filter((r): r is PromiseFulfilledResult<NewsItemServer[]> => r.status === 'fulfilled')
        .flatMap(r => r.value),
    ]
      .filter(item => {
        if (seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    res.json(all);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
}
