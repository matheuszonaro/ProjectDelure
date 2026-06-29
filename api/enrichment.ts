import type { VercelRequest, VercelResponse } from '@vercel/node';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ── OpenCritic ─────────────────────────────────────────── */

interface OpenCriticResult {
  id: number; name: string; Score: number; tier: string;
  percentRecommended: number; percentile: number;
}

/** Returns a 0–1 similarity score between two game titles.
 *  Checks exact match, containment, and word overlap. */
function titleSimilarity(searched: string, found: string): number {
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const a = norm(searched);
  const b = norm(found);
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const wa = a.split(' ').filter(w => w.length > 2);
  const wb = new Set(b.split(' ').filter(w => w.length > 2));
  if (wa.length === 0) return 0.5; // very short title — give benefit of the doubt
  const overlap = wa.filter(w => wb.has(w)).length;
  return overlap / wa.length;
}

async function fetchOpenCritic(title: string) {
  try {
    const url = `https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as OpenCriticResult[];
    if (!Array.isArray(data) || data.length === 0) return null;

    // Pick the first result that is a close enough title match.
    // This prevents generic titles like "Sonic" or "Mario" from returning
    // a completely unrelated game that happens to rank first in OpenCritic's search.
    const THRESHOLD = 0.4;
    const g = data.find(candidate => titleSimilarity(title, candidate.name) >= THRESHOLD);
    if (!g) return null;

    return {
      score:              typeof g.Score === 'number' && g.Score > 0 ? Math.round(g.Score) : null,
      tier:               g.tier   ?? null,
      percentRecommended: typeof g.percentRecommended === 'number' ? Math.round(g.percentRecommended) : null,
      url: `https://opencritic.com/game/${g.id}/${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    };
  } catch { return null; }
}

/* ── RSS helpers ─────────────────────────────────────────── */

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m  = re.exec(xml);
  return m ? cleanEntities(m[1].trim()) : '';
}

function cleanEntities(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, '').trim();
}

function parseRssItems(xml: string) {
  const items: { title: string; link: string; pubDate: string; source: string }[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const title   = extractTag(block, 'title');
    // Google News wraps the real URL in a <link> after CDATA content
    const linkRaw = extractTag(block, 'link') || extractTag(block, 'guid');
    const link    = linkRaw.replace(/\?.*$/, '').trim() || linkRaw;
    const pubDate = extractTag(block, 'pubDate');
    const source  = extractTag(block, 'source');
    if (title && linkRaw) items.push({ title, link: linkRaw, pubDate, source });
    if (items.length >= 6) break;
  }
  return items;
}

/* ── Reddit types ───────────────────────────────────────── */

interface RedditChild {
  data: {
    title: string; url: string; permalink: string;
    subreddit: string; score: number; num_comments: number;
    created_utc: number; thumbnail?: string;
    selftext?: string;
  };
}

/* ── Fetch helpers ──────────────────────────────────────── */

async function fetchGoogleNews(title: string) {
  const q   = encodeURIComponent(`"${title}" Nintendo`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en&gl=US&ceid=US:en`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRssItems(xml);
}

async function fetchReddit(title: string) {
  const q   = encodeURIComponent(`${title} Nintendo Switch`);
  const url = `https://www.reddit.com/search.json?q=${q}&sort=top&limit=5&t=year`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'delure-app/1.0 (nintendo price tracker)', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json() as { data?: { children?: RedditChild[] } };
  return (data.data?.children ?? [])
    .filter(c => c.data.score > 10)
    .map(c => ({
      title:       c.data.title,
      url:         `https://www.reddit.com${c.data.permalink}`,
      subreddit:   c.data.subreddit,
      score:       c.data.score,
      numComments: c.data.num_comments,
      createdUtc:  c.data.created_utc,
      thumbnail:   c.data.thumbnail?.startsWith('http') ? c.data.thumbnail : undefined,
    }));
}

/* ── Handler ────────────────────────────────────────────── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  const { title = '' } = req.query as Record<string, string>;
  if (!title.trim()) return res.json({ news: [], reddit: [] });

  const [newsResult, redditResult, ocResult] = await Promise.allSettled([
    fetchGoogleNews(title),
    fetchReddit(title),
    fetchOpenCritic(title),
  ]);

  res.json({
    news:        newsResult.status   === 'fulfilled' ? newsResult.value   : [],
    reddit:      redditResult.status === 'fulfilled' ? redditResult.value : [],
    opencritic:  ocResult.status     === 'fulfilled' ? ocResult.value     : null,
  });
}
