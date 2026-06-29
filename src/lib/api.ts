import type { Game, GameDetail, NewsItem, GameTab, PlatformFilter } from '../types';
import { MOCK_GAMES, MOCK_NEWS } from './mockData';
import { recordPrice } from './priceHistory';
import { getNewsSources } from './settings';

/* ─── Re-export price helpers ─── */
export { getHistoricalLow, getPriceHistory } from './priceHistory';

/* ─── Nintendo eShop types ─── */
interface NintendoRegularPrice  { amount: string; currency: string; raw_value: string; }
interface NintendoDiscountPrice extends NintendoRegularPrice { start_datetime: string; end_datetime: string; }
interface NintendoContent {
  id: string; formal_name: string;
  publisher: { name: string };
  genre: string;
  screenshots?: Array<{ url: string; orientation: string }>;
  hero_banner_url?: string;
  platform?: 'Switch' | 'Switch 2';
  nsuid?: string;
  releaseDate?: string;
  releaseDateIso?: string;
  price?: { regular_price: NintendoRegularPrice; discount_price?: NintendoDiscountPrice };
}
interface NintendoDetailContent extends NintendoContent {
  description?: string; developer?: string; releaseDate?: string; releaseDateIso?: string;
  ageRating?: string; playersMin?: number; playersMax?: number;
  hasDigital?: boolean; hasPhysical?: boolean; hasDemo?: boolean;
  hasDlc?: boolean; fileSize?: string; languages?: string;
  categories?: string[]; series?: string; eshopUrl?: string;
  screenshotUrls?: string[];
  images?: { hero?: string; banner?: string; square?: string };
}
export interface NintendoResponse {
  contents:      NintendoContent[];
  offset:        number;
  total_number:  number;
}
export interface NintendoDetailResponse {
  game: NintendoDetailContent | null;
}

/* ─── Transform ─── */
export function toGame(c: NintendoContent): Game {
  const original   = parseFloat(c.price?.regular_price.raw_value ?? '0');
  const discounted = c.price?.discount_price ? parseFloat(c.price.discount_price.raw_value) : undefined;
  const cover      = c.hero_banner_url ?? c.screenshots?.[0]?.url ?? '';
  const discount   = discounted !== undefined && original > 0
    ? Math.round((1 - discounted / original) * 100) : undefined;
  const current    = discounted ?? original;
  const onSale     = (discount ?? 0) > 0;
  if (current > 0) recordPrice(c.id, current, onSale, original);
  return {
    id: c.id, title: c.formal_name, publisher: c.publisher?.name ?? '',
    coverImage: cover,
    price: { original, current, currency: 'AUD', discount, saleEnds: c.price?.discount_price?.end_datetime },
    genre: c.genre ?? '',
    platform: c.platform ?? 'Switch',
    nsuid: c.nsuid,
    releaseDate: c.releaseDate,
    releaseDateIso: c.releaseDateIso,
  };
}

export function toGameDetail(c: NintendoDetailContent): GameDetail {
  const base = toGame(c);
  return {
    ...base,
    description:    c.description,
    developer:      c.developer,
    releaseDate:    c.releaseDate,
    releaseDateIso: c.releaseDateIso,
    ageRating:      c.ageRating,
    playersMin:     c.playersMin,
    playersMax:     c.playersMax,
    hasDigital:     c.hasDigital,
    hasPhysical:    c.hasPhysical,
    hasDemo:        c.hasDemo,
    hasDlc:         c.hasDlc,
    fileSize:       c.fileSize,
    languages:      c.languages,
    categories:     c.categories,
    series:         c.series,
    eshopUrl:       c.eshopUrl,
    screenshotUrls: c.screenshotUrls,
    images:         c.images,
  };
}

/* ─── Game list fetch ─── */
export async function fetchGames(
  tab: GameTab,
  limit = 24,
  offset = 0,
  platform: PlatformFilter = 'all',
  sort = 'default',
): Promise<{ games: Game[]; total: number }> {
  try {
    const sortParam = sort !== 'default' ? `&sort=${encodeURIComponent(sort)}` : '';
    const res = await fetch(
      `/api/nintendo?type=${tab}&limit=${limit}&offset=${offset}&platform=${platform}${sortParam}`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as NintendoResponse;
    const shouldFilterPrice = platform !== 'switch2' && tab !== 'coming-soon';
    const games = (data.contents ?? [])
      .map(toGame)
      .filter(g => g.title && (shouldFilterPrice ? g.price.original > 0 : true));
    if (games.length === 0 && offset === 0) throw new Error('Empty');
    return { games, total: data.total_number ?? games.length };
  } catch {
    if (offset > 0) return { games: [], total: 0 };
    const pool = tab === 'sales'
      ? MOCK_GAMES.filter(g => (g.price.discount ?? 0) > 0)
      : tab === 'new' ? [...MOCK_GAMES].reverse() : MOCK_GAMES;
    return { games: pool, total: pool.length };
  }
}

export async function searchGames(
  query: string,
  limit = 24,
  offset = 0,
  platform: PlatformFilter = 'all',
  sort = 'default',
): Promise<{ games: Game[]; total: number }> {
  if (!query.trim()) return { games: [], total: 0 };
  try {
    const sortParam = sort !== 'default' ? `&sort=${encodeURIComponent(sort)}` : '';
    const res = await fetch(
      `/api/nintendo?type=search&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&platform=${platform}${sortParam}`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as NintendoResponse;
    const games = (data.contents ?? [])
      .map(toGame)
      .filter(g => g.title && g.price.original > 0);
    return { games, total: data.total_number ?? games.length };
  } catch {
    const q = query.toLowerCase();
    const filtered = MOCK_GAMES.filter(g =>
      g.title.toLowerCase().includes(q) || g.publisher.toLowerCase().includes(q)
    );
    return { games: filtered, total: filtered.length };
  }
}

export async function fetchGameDetail(fsId: string): Promise<GameDetail | null> {
  try {
    const res = await fetch(`/api/nintendo?type=detail&id=${encodeURIComponent(fsId)}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as NintendoDetailResponse;
    if (!data.game) return null;
    return toGameDetail(data.game);
  } catch {
    return null;
  }
}

/* ─── Game enrichment (news + reddit + opencritic) ─── */
export interface EnrichmentNews {
  title: string; link: string; pubDate: string; source: string;
}
export interface EnrichmentReddit {
  title: string; url: string; subreddit: string; score: number;
  numComments: number; createdUtc: number; thumbnail?: string;
}
export interface EnrichmentOpenCritic {
  score: number | null;
  tier: string | null;
  percentRecommended: number | null;
  url: string;
}

export async function fetchEnrichment(title: string): Promise<{
  news: EnrichmentNews[];
  reddit: EnrichmentReddit[];
  opencritic: EnrichmentOpenCritic | null;
}> {
  try {
    const res = await fetch(`/api/enrichment?title=${encodeURIComponent(title)}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as { news: EnrichmentNews[]; reddit: EnrichmentReddit[]; opencritic: EnrichmentOpenCritic | null };
  } catch {
    return { news: [], reddit: [], opencritic: null };
  }
}

/* ─── News ─── */
function extractImg(chunk: string): string | undefined {
  const m = chunk.match(/url=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)["']/i)
    ?? chunk.match(/<enclosure[^>]+url=["']([^"']+)["']/i)
    ?? chunk.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

function cleanHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** Build a paginated URL — WordPress `?paged=N` convention */
function pagedUrl(base: string, page: number): string {
  if (page <= 1) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}paged=${page}`;
}

/** Try multiple CORS proxies in order, return raw XML or null */
const PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

async function fetchViaProxy(url: string): Promise<string | null> {
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(`${proxy}${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const text = await r.text();
      if (text.length > 100) return text;
    } catch { /* try next */ }
  }
  return null;
}

function parseRSS(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];

  // Support both RSS (<item>) and Atom (<entry>) feeds
  const isAtom = xml.includes('<entry') && !xml.includes('<item');
  const rx = isAtom
    ? /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    : /<item[^>]*>([\s\S]*?)<\/item>/gi;

  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml)) !== null) {
    const c = m[1];
    const get = (tag: string) => {
      const r = c.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return r?.[1]?.trim() ?? '';
    };

    const title = cleanHtml(get('title'));

    // Atom: <link href="..."/> attribute; RSS: <link> text or <guid>
    const link = isAtom
      ? (c.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ?? get('id'))
      : (get('link') || get('guid'));

    if (!title || !link) continue;

    const pubDate = isAtom
      ? (get('published') || get('updated') || new Date().toISOString())
      : (get('pubDate') || get('published') || new Date().toISOString());

    // Prefer content:encoded for full body
    const contentEncoded = c.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1]?.trim() ?? '';
    const rawDesc         = get('description') || get('summary') || (isAtom ? get('content') : '') || '';
    const fullRaw         = contentEncoded || rawDesc;

    items.push({
      id:              `${sourceName}-${link.slice(-32)}`,
      title,
      description:     cleanHtml(rawDesc).slice(0, 260),
      fullDescription: cleanHtml(fullRaw).slice(0, 3000),
      link,
      pubDate,
      thumbnail:       extractImg(c),
      source:          sourceName,
    });
  }
  return items;
}

/**
 * Fetch one page of news from all enabled sources.
 *
 * Primary path: server-side /api/news?page=N (no CORS, all sources).
 *   The result is then filtered client-side by the user's enabled-source list
 *   so that sources disabled in Settings are actually excluded.
 *
 * Fallback: client-side CORS proxy (already uses only enabled sources).
 * Deduplication is handled by the caller (useNews hook).
 */
export async function fetchNews(page = 1): Promise<NewsItem[]> {
  const enabledSources = getNewsSources(); // already filtered to enabled: true
  const enabledNames   = new Set(enabledSources.map(s => s.name));

  // If the user has disabled every source, return empty immediately
  if (enabledNames.size === 0) return [];

  const applyFilter = (items: NewsItem[]) =>
    items.filter(item => enabledNames.has(item.source));

  // Primary: server-side function handles all sources without CORS
  try {
    const res = await fetch(`/api/news?page=${page}`, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const data     = await res.json() as NewsItem[];
      const filtered = applyFilter(data);
      // For page > 1, an empty filtered array is a valid "no more articles" signal
      if (filtered.length > 0 || page > 1) return filtered;
    }
  } catch { /* fall through to CORS proxy */ }

  // Fallback: client-side CORS proxy — fetch only enabled sources
  const results = await Promise.allSettled(
    enabledSources.map(async src => {
      const url = pagedUrl(src.url, page);
      const xml = await fetchViaProxy(url);
      if (!xml) return [] as NewsItem[];
      return parseRSS(xml, src.name);
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
  // Note: we no longer fall back to MOCK_NEWS — the error state in useNews handles
  // the empty-result case honestly instead of silently showing stale fake data.
}
