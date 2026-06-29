import type { VercelRequest, VercelResponse } from '@vercel/node';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ── RSS sources (must stay in sync with src/lib/settings.ts) ── */
const SOURCES = [
  { name: 'Nintendo Life',    url: 'https://www.nintendolife.com/feeds/latest'             },
  { name: 'My Nintendo News', url: 'https://mynintendonews.com/feed/'                      },
  { name: 'Gematsu',          url: 'https://gematsu.com/category/nintendo/feed'            },
  { name: 'Vooks',            url: 'https://www.vooks.net/feed/'                           },
  { name: 'GoNintendo',       url: 'https://gonintendo.com/feed'                           },
  { name: 'Siliconera',       url: 'https://www.siliconera.com/category/nintendo/feed/'    },
  { name: 'Nintendo Insider', url: 'https://www.nintendo-insider.com/feed/'                            },
  { name: 'Nintendo Blast',   url: 'https://www.nintendoblast.com.br/feeds/posts/default?alt=rss' },
];

/* ── Types ── */
export interface SummaryArticle {
  title: string; description: string; link: string;
  pubDate: string; source: string; thumbnail?: string;
}

export interface AISummaryResponse {
  summary: { en: string; pt: string } | null;
  articles: SummaryArticle[];
  generatedAt: string;
}

/* ── RSS parser ── */
function clean(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&nbsp;/g,' ')
    .trim();
}

function extractImg(block: string): string | undefined {
  const m = block.match(/url=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)["']/i)
    ?? block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)
    ?? block.match(/<img[^>]+src=["']([^"']*)["']/i);
  return m?.[1];
}

function parseRSS(xml: string, source: string): SummaryArticle[] {
  const out: SummaryArticle[] = [];
  // Support both RSS (<item>) and Atom (<entry>) feeds
  const isAtom = xml.includes('<entry') && !xml.includes('<item');
  const rx = isAtom ? /<entry[^>]*>([\s\S]*?)<\/entry>/gi : /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml)) !== null) {
    const b = m[1];
    const get = (tag: string) => {
      const r = b.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return r?.[1]?.trim() ?? '';
    };
    const title = clean(get('title'));
    // Atom uses <link href="..."/>, RSS uses <link>...</link> or <guid>
    const link = isAtom
      ? (b.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ?? get('id'))
      : (get('link') || get('guid'));
    if (!title || !link) continue;
    const pubDate = isAtom
      ? (get('published') || get('updated') || new Date().toISOString())
      : (get('pubDate') || get('published') || new Date().toISOString());
    out.push({
      title,
      description: clean(get('description') || get('summary') || (isAtom ? get('content') : '') || '').slice(0, 400),
      link,
      pubDate,
      source,
      thumbnail: extractImg(b),
    });
  }
  return out;
}

/* ── Fetch all RSS feeds ── */
async function fetchAllArticles(): Promise<SummaryArticle[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async src => {
      const r = await fetch(src.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000) });
      return parseRSS(await r.text(), src.name);
    })
  );

  const cutoff = Date.now() - 24 * 3600 * 1000;
  const seen = new Set<string>();

  return results
    .filter((r): r is PromiseFulfilledResult<SummaryArticle[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(a => {
      const ts = new Date(a.pubDate).getTime();
      if (isNaN(ts) || ts < cutoff) return false;
      if (seen.has(a.link)) return false;
      seen.add(a.link);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

/* ── AI summary via Pollinations (free, no key required) ── */
function parseAIJson(raw: string): { en: string; pt: string } | null {
  // Strip markdown fences if present
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/gi, '').trim();
  // Try direct parse
  try {
    const d = JSON.parse(stripped) as { en?: string; pt?: string };
    if (d.en && d.pt) return { en: d.en, pt: d.pt };
  } catch { /* fall through */ }
  // Extract first JSON object
  const match = stripped.match(/\{[\s\S]*?\}/);
  if (match) {
    try {
      const d = JSON.parse(match[0]) as { en?: string; pt?: string };
      if (d.en && d.pt) return { en: d.en, pt: d.pt };
    } catch { /* fall through */ }
  }
  return null;
}

async function generateAISummary(articles: SummaryArticle[]): Promise<{ en: string; pt: string } | null> {
  if (articles.length < 2) return null;

  const digest = articles.slice(0, 15).map((a, i) =>
    `${i + 1}. [${a.source}] ${a.title}: ${a.description}`
  ).join('\n');

  const prompt = `You are a Nintendo gaming news journalist writing a daily digest. Below are the most important Nintendo news articles from the last 24 hours. Write a thorough, detailed digest covering EVERY story — include specific game names, release dates, prices, features, platforms, developer names, and any notable announcements. Do not skip or combine stories; give each one its own space.

Articles:
${digest}

Reply with ONLY a raw JSON object (no markdown, no code fences):
{"en":"5-6 detailed English paragraphs covering all stories above","pt":"5-6 parágrafos detalhados em Português cobrindo todas as notícias acima"}`;

  try {
    // Seed changes every 30 min — same window returns same digest, new window generates fresh
    const halfHourSeed = Math.floor(Date.now() / 1800000);

    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain, application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'You are a JSON-only responder. Output raw JSON with no markdown, no code blocks.' },
          { role: 'user', content: prompt },
        ],
        jsonMode: true,
        seed: halfHourSeed,
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) return null;
    const text = await res.text();
    return parseAIJson(text);
  } catch { return null; }
}

/* ── Fallback extractive summary ── */
function extractiveSummary(articles: SummaryArticle[]): { en: string; pt: string } {
  const top = articles.slice(0, 6);
  const en = top.map(a => `• ${a.title} (${a.source})`).join('\n');
  const pt = top.map(a => `• ${a.title} (${a.source})`).join('\n');
  return {
    en: `Here's your Nintendo news roundup for the last 24 hours:\n\n${en}`,
    pt: `Confira as principais notícias Nintendo das últimas 24 horas:\n\n${pt}`,
  };
}

/* ── Handler ── */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 3h at edge, serve stale for 1h while revalidating
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=900');

  try {
    const articles = await fetchAllArticles();
    const aiResult = await generateAISummary(articles);
    const summary  = aiResult ?? (articles.length >= 2 ? extractiveSummary(articles) : null);

    res.json({
      summary,
      articles,
      generatedAt: new Date().toISOString(),
    } satisfies AISummaryResponse);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
