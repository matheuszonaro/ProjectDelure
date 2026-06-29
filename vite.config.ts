import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { XMLParser } from 'fast-xml-parser';

const EU_SEARCH = 'https://searching.nintendo-europe.com/en/select';
const AU_PRICE  = 'https://api.ec.nintendo.com/v1/price';
const HEADERS   = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

interface EuDoc {
  fs_id: string; title: string; nsuid_txt?: string | string[];
  image_url_h2x1_s?: string; image_url_sq_s?: string;
  wishlist_email_banner640w_image_url_s?: string;
  publisher?: string; developer?: string;
  game_categories_txt?: string | string[];
  pretty_game_categories_txt?: string | string[];
  price_discount_percentage_f?: number; price_has_discount_b?: boolean;
  system_type?: string | string[];
  product_catalog_description_s?: string; excerpt?: string;
  dates_released_dts?: string | string[]; pretty_date_s?: string;
  age_rating_value?: string; pretty_agerating_s?: string;
  players_from?: number; players_to?: number;
  digital_version_b?: boolean; physical_version_b?: boolean;
  demo_availability?: boolean; add_on_content_b?: boolean;
  system_names_txt?: string | string[];
  datasize_readable_txt?: string; language_availability?: string | string[];
  game_series_txt?: string | string[];
  url?: string;
  screenshots_url_s?: string | string[];
}
interface AuPrice {
  title_id: number; sales_status: string;
  regular_price?:  { amount: string; currency: string; raw_value: string };
  discount_price?: { amount: string; currency: string; raw_value: string; start_datetime: string; end_datetime: string };
}

function extractNsuid(doc: EuDoc): string {
  if (!doc.nsuid_txt) return '';
  const ids = Array.isArray(doc.nsuid_txt) ? doc.nsuid_txt : doc.nsuid_txt.split(/\s+/);
  return ids.find(id => id.trim().startsWith('7'))?.trim() ?? '';
}
function isSwitch2(doc: EuDoc): boolean {
  const st = Array.isArray(doc.system_type) ? doc.system_type : [doc.system_type ?? ''];
  return st.some(s => s.includes('nintendoswitch2'));
}
function bestImage(doc: EuDoc): string {
  return doc.image_url_h2x1_s || doc.wishlist_email_banner640w_image_url_s || doc.image_url_sq_s || '';
}
function firstVal(v?: string | string[]): string {
  if (!v) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}
function allVals(v?: string | string[]): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : v.split(/[,;]\s*/);
}

/** Parallel AU price fetch (all chunks at once) */
async function batchAuPrices(nsuids: string[]): Promise<Map<string, AuPrice>> {
  const map = new Map<string, AuPrice>();
  if (nsuids.length === 0) return map;
  const chunks: string[][] = [];
  for (let i = 0; i < nsuids.length; i += 50) chunks.push(nsuids.slice(i, i + 50));
  const results = await Promise.allSettled(
    chunks.map(chunk =>
      fetch(`${AU_PRICE}?country=AU&lang=en&ids=${chunk.join(',')}`, {
        headers: HEADERS, signal: AbortSignal.timeout(8000),
      }).then(r => r.ok ? r.json() as Promise<{ prices: AuPrice[] }> : null)
    )
  );
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      for (const p of r.value.prices) map.set(String(p.title_id), p);
    }
  }
  return map;
}

function buildSystemFilter(platform: string): string {
  const sw1 = '(system_type:nintendoswitch_digitaldistribution OR system_type:nintendoswitch_gamecard)';
  const sw2 = 'system_type:nintendoswitch2';
  if (platform === 'switch1') return sw1;
  if (platform === 'switch2') return sw2;
  return `(${sw1} OR ${sw2})`;
}

function buildContentRow(doc: EuDoc, nsuid: string, auPrice: AuPrice | undefined) {
  const sw2 = isSwitch2(doc);
  return {
    id: doc.fs_id, formal_name: doc.title,
    publisher: { name: doc.publisher ?? '' },
    genre: firstVal(doc.game_categories_txt),
    hero_banner_url: bestImage(doc), screenshots: [] as string[],
    platform: sw2 ? 'Switch 2' : 'Switch',
    nsuid,
    releaseDate:    doc.pretty_date_s ?? firstVal(doc.dates_released_dts) ?? '',
    releaseDateIso: firstVal(doc.dates_released_dts) ?? '',
    price: auPrice?.regular_price ? {
      regular_price:  auPrice.regular_price,
      discount_price: auPrice.discount_price,
    } : undefined,
  };
}

async function fetchList(
  type: string, q: string, limit: number, offset: number,
  platform: string, clientSort = '',
) {
  const systemFilter = buildSystemFilter(platform);
  let fq   = `type:SOFTWARE AND ${systemFilter}`;
  let sort = 'date_from desc';
  let euQ  = '*';
  const needPrice = platform !== 'switch2' && type !== 'coming-soon';

  if (type === 'sales') {
    fq  += ' AND price_has_discount_b:true' + (needPrice ? ' AND price_sorting_f:[1 TO *]' : '');
    sort = 'price_discount_percentage_f desc';
  } else if (type === 'popular') {
    fq  += needPrice ? ' AND price_sorting_f:[1 TO *]' : '';
    sort = 'price_sorting_f desc, date_from desc';
  } else if (type === 'new') {
    fq  += needPrice ? ' AND price_sorting_f:[1 TO *]' : '';
    sort = 'date_from desc';
  } else if (type === 'all') {
    fq  += needPrice ? ' AND price_sorting_f:[1 TO *]' : '';
    sort = 'title asc';
  } else if (type === 'coming-soon') {
    fq  += ' AND dates_released_dts:[NOW+1DAY TO *]';
    sort = 'dates_released_dts asc';
  } else if (type === 'search') {
    euQ  = q || '*';
    sort = 'score desc, date_from desc';
  }

  if (clientSort === 'name') sort = 'title asc';

  const fl = [
    'fs_id,title,nsuid_txt,system_type',
    'image_url_h2x1_s,image_url_sq_s,wishlist_email_banner640w_image_url_s',
    'publisher,game_categories_txt',
    'price_discount_percentage_f,price_has_discount_b',
    'dates_released_dts,pretty_date_s',
  ].join(',');

  const euUrl = `${EU_SEARCH}?q=${encodeURIComponent(euQ)}&rows=${limit}&start=${offset}&fq=${encodeURIComponent(fq)}&wt=json&sort=${encodeURIComponent(sort)}&fl=${encodeURIComponent(fl)}`;
  const euRes = await fetch(euUrl, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!euRes.ok) throw new Error(`EU ${euRes.status}`);
  const euData = await euRes.json() as { response: { numFound: number; docs: EuDoc[] } };
  const docs = euData.response.docs;

  const nsuidMap = new Map<string, string>();
  for (const doc of docs) {
    const nsuid = extractNsuid(doc);
    if (nsuid) nsuidMap.set(doc.fs_id, nsuid);
  }
  const priceMap = await batchAuPrices([...new Set(nsuidMap.values())]);

  const contents = docs
    .map(doc => buildContentRow(
      doc,
      nsuidMap.get(doc.fs_id) ?? '',
      nsuidMap.get(doc.fs_id) ? priceMap.get(nsuidMap.get(doc.fs_id)!) : undefined,
    ))
    .filter(c => c.formal_name && (needPrice ? (c.price?.regular_price?.raw_value ?? '0') !== '0' : true));

  return { contents, offset, total_number: euData.response.numFound };
}

async function fetchAllAndSortByAU(
  type: string, q: string, limit: number, offset: number,
  platform: string, clientSort: string,
) {
  const systemFilter = buildSystemFilter(platform);
  let fq = `type:SOFTWARE AND ${systemFilter}`;
  const needPrice = platform !== 'switch2';
  let euQ = '*';

  if (type === 'sales') {
    fq += ' AND price_has_discount_b:true' + (needPrice ? ' AND price_sorting_f:[1 TO *]' : '');
  } else if (['popular', 'new', 'all'].includes(type)) {
    fq += needPrice ? ' AND price_sorting_f:[1 TO *]' : '';
  } else if (type === 'search') {
    euQ = q || '*';
  }

  const fl = [
    'fs_id,title,nsuid_txt,system_type',
    'image_url_h2x1_s,image_url_sq_s,wishlist_email_banner640w_image_url_s',
    'publisher,game_categories_txt',
    'price_discount_percentage_f,price_has_discount_b',
    'dates_released_dts,pretty_date_s',
  ].join(',');

  const MAX = 300;
  const euUrl = `${EU_SEARCH}?q=${encodeURIComponent(euQ)}&rows=${MAX}&start=0&fq=${encodeURIComponent(fq)}&wt=json&fl=${encodeURIComponent(fl)}`;
  const euRes = await fetch(euUrl, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (!euRes.ok) throw new Error(`EU ${euRes.status}`);
  const euData = await euRes.json() as { response: { numFound: number; docs: EuDoc[] } };
  const docs = euData.response.docs;

  const nsuidMap = new Map<string, string>();
  for (const doc of docs) {
    const nsuid = extractNsuid(doc);
    if (nsuid) nsuidMap.set(doc.fs_id, nsuid);
  }
  const priceMap = await batchAuPrices([...new Set(nsuidMap.values())]);

  const enriched = docs
    .map(doc => {
      const nsuid   = nsuidMap.get(doc.fs_id) ?? '';
      const auPrice = nsuid ? priceMap.get(nsuid) : undefined;
      const auOrig  = auPrice?.regular_price  ? parseFloat(auPrice.regular_price.raw_value)  : 0;
      const auCurr  = auPrice?.discount_price ? parseFloat(auPrice.discount_price.raw_value) : auOrig;
      const auDisc  = auOrig > 0 ? Math.round((1 - auCurr / auOrig) * 100) : 0;
      return { content: buildContentRow(doc, nsuid, auPrice), auOrig, auCurr, auDisc };
    })
    .filter(({ content, auOrig }) => content.formal_name && (needPrice ? auOrig > 0 : true));

  enriched.sort((a, b) => {
    switch (clientSort) {
      case 'price-asc':  return a.auCurr - b.auCurr;
      case 'price-desc': return b.auCurr - a.auCurr;
      case 'discount':   return b.auDisc - a.auDisc;
      default:           return 0;
    }
  });

  const page = enriched.slice(offset, offset + limit).map(e => e.content);
  return { contents: page, offset, total_number: enriched.length };
}

async function fetchDetail(fsId: string) {
  const fl = [
    'fs_id,title,nsuid_txt,system_type',
    'image_url_h2x1_s,image_url_sq_s,wishlist_email_banner640w_image_url_s',
    'screenshots_url_s',
    'product_catalog_description_s,excerpt',
    'dates_released_dts,pretty_date_s',
    'publisher,developer',
    'age_rating_value,pretty_agerating_s',
    'players_from,players_to',
    'digital_version_b,physical_version_b,demo_availability,add_on_content_b',
    'system_names_txt,game_categories_txt,pretty_game_categories_txt',
    'game_series_txt,datasize_readable_txt,language_availability',
    'price_sorting_f,price_discount_percentage_f,price_has_discount_b',
    'url,copyright_s',
  ].join(',');

  const euUrl = `${EU_SEARCH}?q=*&rows=1&start=0&fq=${encodeURIComponent(`fs_id:${fsId}`)}&wt=json&fl=${encodeURIComponent(fl)}`;
  const euRes = await fetch(euUrl, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!euRes.ok) throw new Error(`EU ${euRes.status}`);
  const euData = await euRes.json() as { response: { docs: EuDoc[] } };
  const doc = euData.response.docs[0];
  if (!doc) return null;

  const nsuid = extractNsuid(doc);
  let auPrice: AuPrice | undefined;
  if (nsuid) {
    const pm = await batchAuPrices([nsuid]);
    auPrice = pm.get(nsuid);
  }

  const releaseRaw  = firstVal(doc.dates_released_dts);
  const releaseDate = releaseRaw
    ? new Date(releaseRaw).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : doc.pretty_date_s ?? '';

  const cats     = allVals(doc.pretty_game_categories_txt ?? doc.game_categories_txt);
  const langs    = allVals(doc.language_availability).map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ');
  const series   = firstVal(doc.game_series_txt)?.replace(/_/g, ' ') ?? '';
  const sw2      = isSwitch2(doc);
  const eshopPath = doc.url?.replace('/en-gb/', '/au/') ?? '';
  const screenshotUrls = allVals(doc.screenshots_url_s).filter(Boolean);

  return {
    id: doc.fs_id, formal_name: doc.title,
    publisher: { name: doc.publisher ?? '' },
    genre: firstVal(doc.game_categories_txt),
    hero_banner_url: bestImage(doc),
    screenshots: [],
    platform: sw2 ? 'Switch 2' : 'Switch',
    nsuid,
    description: doc.product_catalog_description_s || doc.excerpt || '',
    developer:   doc.developer ?? '',
    releaseDate,
    releaseDateIso: releaseRaw,
    ageRating:   doc.pretty_agerating_s ?? '',
    playersMin:  doc.players_from,
    playersMax:  doc.players_to,
    hasDigital:  doc.digital_version_b,
    hasPhysical: doc.physical_version_b,
    hasDemo:     doc.demo_availability,
    hasDlc:      doc.add_on_content_b,
    fileSize:    doc.datasize_readable_txt ?? '',
    languages:   langs,
    categories:  cats,
    series,
    screenshotUrls,
    eshopUrl: eshopPath ? `https://www.nintendo.com${eshopPath}` : '',
    images: {
      hero:   doc.image_url_h2x1_s,
      banner: doc.wishlist_email_banner640w_image_url_s,
      square: doc.image_url_sq_s,
    },
    price: auPrice?.regular_price ? {
      regular_price:  auPrice.regular_price,
      discount_price: auPrice.discount_price,
    } : undefined,
  };
}

/* ── Enrichment helpers ────────────────────────────────── */

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m  = re.exec(xml);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim() : '';
}

function parseRssItems(xml: string) {
  const items: { title: string; link: string; pubDate: string; source: string }[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const title   = extractTag(block, 'title');
    const linkRaw = extractTag(block, 'link') || extractTag(block, 'guid');
    const pubDate = extractTag(block, 'pubDate');
    const source  = extractTag(block, 'source');
    if (title && linkRaw) items.push({ title, link: linkRaw, pubDate, source });
    if (items.length >= 6) break;
  }
  return items;
}

interface RedditChild {
  data: { title: string; url: string; permalink: string; subreddit: string; score: number; num_comments: number; created_utc: number; thumbnail?: string };
}

/* ── OpenCritic ──────────────────────────────────────────── */

interface OpenCriticResult {
  id: number; name: string; Score: number; tier: string; percentRecommended: number;
}

async function fetchOpenCritic(title: string) {
  try {
    const url = `https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as OpenCriticResult[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const g = data[0];
    return {
      score:              typeof g.Score === 'number' && g.Score > 0 ? Math.round(g.Score) : null,
      tier:               g.tier ?? null,
      percentRecommended: typeof g.percentRecommended === 'number' ? Math.round(g.percentRecommended) : null,
      url: `https://opencritic.com/game/${g.id}/${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    };
  } catch { return null; }
}

async function fetchEnrichment(title: string) {
  const q   = encodeURIComponent(`"${title}" Nintendo`);
  const rssUrl = `https://news.google.com/rss/search?q=${q}&hl=en&gl=US&ceid=US:en`;
  const reddUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(title + ' Nintendo Switch')}&sort=top&limit=5&t=year`;

  const [newsRes, reddRes, ocRes] = await Promise.allSettled([
    fetch(rssUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] }, signal: AbortSignal.timeout(8000) }),
    fetch(reddUrl, { headers: { 'User-Agent': 'delure-app/1.0', 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }),
    fetchOpenCritic(title),
  ]);

  const news = newsRes.status === 'fulfilled' && newsRes.value.ok
    ? parseRssItems(await newsRes.value.text())
    : [];

  let reddit: object[] = [];
  if (reddRes.status === 'fulfilled' && reddRes.value.ok) {
    const d = await reddRes.value.json() as { data?: { children?: RedditChild[] } };
    reddit = (d.data?.children ?? [])
      .filter(c => c.data.score > 10)
      .map(c => ({
        title: c.data.title, url: `https://www.reddit.com${c.data.permalink}`,
        subreddit: c.data.subreddit, score: c.data.score,
        numComments: c.data.num_comments, createdUtc: c.data.created_utc,
        thumbnail: c.data.thumbnail?.startsWith('http') ? c.data.thumbnail : undefined,
      }));
  }

  return {
    news,
    reddit,
    opencritic: ocRes.status === 'fulfilled' ? ocRes.value : null,
  };
}

/* ── AI Summary (mirrors api/ai-summary.ts) ─────────────────── */

const AI_SOURCES = [
  { name: 'Nintendo Life',     url: 'https://www.nintendolife.com/feeds/latest'             },
  { name: 'My Nintendo News',  url: 'https://mynintendonews.com/feed/'                      },
  { name: 'Gematsu',           url: 'https://gematsu.com/category/nintendo/feed'            },
  { name: 'Vooks',             url: 'https://www.vooks.net/feed/'                           },
  { name: 'GoNintendo',        url: 'https://gonintendo.com/feed'                           },
  { name: 'Siliconera',        url: 'https://www.siliconera.com/category/nintendo/feed/'    },
  { name: 'Nintendo Insider',  url: 'https://www.nintendo-insider.com/feed/'                },
  { name: 'Nintendo Blast',    url: 'https://www.nintendoblast.com.br/feeds/posts/default?alt=rss' },
  { name: 'Universo Nintendo', url: 'https://universonintendo.com/feed/'                    },
];

interface SummaryArticle {
  title: string; description: string; link: string;
  pubDate: string; source: string; thumbnail?: string;
}

function aiClean(s: string): string {
  return s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&nbsp;/g,' ').trim();
}

function aiExtractImg(b: string): string | undefined {
  return (b.match(/url=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)["']/i)
       ?? b.match(/<enclosure[^>]+url=["']([^"']+)["']/i)
       ?? b.match(/<img[^>]+src=["']([^"']*)["']/i))?.[1];
}

function aiParseRSS(xml: string, source: string): SummaryArticle[] {
  const out: SummaryArticle[] = [];
  const isAtom = xml.includes('<entry') && !xml.includes('<item');
  const rx = isAtom ? /<entry[^>]*>([\s\S]*?)<\/entry>/gi : /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(xml)) !== null) {
    const b = m[1];
    const get = (tag: string) => {
      const r = b.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return r?.[1]?.trim() ?? '';
    };
    const title = aiClean(get('title'));
    const link = isAtom
      ? (b.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ?? get('id'))
      : (get('link') || get('guid'));
    if (!title || !link) continue;
    const pubDate = isAtom
      ? (get('published') || get('updated') || new Date().toISOString())
      : (get('pubDate') || new Date().toISOString());
    out.push({ title, description: aiClean(get('description') || get('summary') || (isAtom ? get('content') : '') || '').slice(0, 400),
               link, pubDate, source, thumbnail: aiExtractImg(b) });
  }
  return out;
}

async function fetchAIArticles(): Promise<SummaryArticle[]> {
  const results = await Promise.allSettled(
    AI_SOURCES.map(async s => {
      const r = await fetch(s.url, { headers: { 'User-Agent': HEADERS['User-Agent'] }, signal: AbortSignal.timeout(7000) });
      return aiParseRSS(await r.text(), s.name);
    })
  );
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const seen = new Set<string>();
  return results
    .filter((r): r is PromiseFulfilledResult<SummaryArticle[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(a => { const ts = new Date(a.pubDate).getTime(); if(isNaN(ts)||ts<cutoff||seen.has(a.link)) return false; seen.add(a.link); return true; })
    .sort((a,b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

function parsePollinationsJson(raw: string): { en: string; pt: string } | null {
  const s = raw.replace(/```(?:json)?\s*/gi,'').replace(/```\s*/gi,'').trim();
  for (const src of [s, (s.match(/\{[\s\S]*?\}/) ?? [])[0]]) {
    try {
      const d = JSON.parse(src ?? '') as { en?: string; pt?: string };
      if (d.en && d.pt) return { en: d.en, pt: d.pt };
    } catch { /* next */ }
  }
  return null;
}

async function generateDevAISummary(articles: SummaryArticle[]): Promise<{ en: string; pt: string } | null> {
  if (articles.length < 2) return null;
  const digest = articles.slice(0,15).map((a,i) => `${i+1}. [${a.source}] ${a.title}: ${a.description}`).join('\n');
  const hourSeed = Math.floor(Date.now() / 1800000);
  try {
    const r = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'You are a JSON-only responder. Output raw JSON with no markdown, no code blocks.' },
          { role: 'user', content: `You are a Nintendo gaming news journalist. Write a thorough digest covering EVERY story below — include game names, release dates, prices, platforms, developer names, and all notable details. Do not skip or combine stories.\n\nArticles:\n${digest}\n\nReply ONLY with raw JSON {"en":"5-6 detailed English paragraphs covering all stories","pt":"5-6 parágrafos detalhados em Português cobrindo todas as notícias"}` },
        ],
        jsonMode: true, seed: hourSeed,
      }),
      signal: AbortSignal.timeout(35000),
    });
    return r.ok ? parsePollinationsJson(await r.text()) : null;
  } catch { return null; }
}

function extractiveFallback(articles: SummaryArticle[]): { en: string; pt: string } {
  const lines = articles.slice(0,6).map(a => `• ${a.title} (${a.source})`).join('\n');
  return {
    en: `Nintendo news highlights from the last 24 hours:\n\n${lines}`,
    pt: `Destaques das notícias Nintendo das últimas 24 horas:\n\n${lines}`,
  };
}

/* ── Article content extractor (mirrors api/article.ts) ─────── */
function devHtmlToText(html: string): string {
  return html
    .replace(/<\/?(p|li|h[1-6]|blockquote|tr)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
    .replace(/&nbsp;/g,' ').replace(/&#(\d+);/g, (_,n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}

function devExtractArticle(html: string): { text: string; image?: string } {
  const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
             ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'')
    .replace(/<nav[\s\S]*?<\/nav>/gi,'').replace(/<header[\s\S]*?<\/header>/gi,'')
    .replace(/<footer[\s\S]*?<\/footer>/gi,'').replace(/<aside[\s\S]*?<\/aside>/gi,'')
    .replace(/<!--[\s\S]*?-->/g,'');
  const selectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+class="[^"]*\b(?:entry-content|post-content|article-content|article-body|content-body|story-body|post-body)\b[^"]*"[^>]*>([\s\S]*?)<\/div\s*>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];
  for (const rx of selectors) {
    const m = clean.match(rx);
    if (m?.[1] && m[1].replace(/<[^>]+>/g,'').trim().length > 200)
      return { text: devHtmlToText(m[1]).slice(0,8000), image };
  }
  return { text: devHtmlToText(clean).slice(0,8000), image };
}

/* ── Dev news items — uses fast-xml-parser (same as api/news.ts in production) ─ */
// Previously this used hand-rolled regex which could behave differently from
// the production path. Now both environments use identical parsing logic.

interface DevNewsItem {
  id: string; title: string; description: string;
  fullDescription: string; link: string; pubDate: string;
  thumbnail?: string; source: string;
}

const devXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  allowBooleanAttributes: true,
  trimValues: true,
});

function devStr(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    return String(o['__cdata'] ?? o['#text'] ?? o['@_href'] ?? '');
  }
  return String(v);
}

function devStripHtml(s: string, max = 99999): string {
  return s
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').trim().slice(0, max);
}

function devPickUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v || undefined;
  if (Array.isArray(v)) { for (const i of v) { const u = devPickUrl(i); if (u) return u; } return undefined; }
  const o = v as Record<string, unknown>;
  const url = o['@_url'] ?? o['url'];
  return typeof url === 'string' && url ? url : undefined;
}

function devExtractThumbnail(it: Record<string, unknown>): string | undefined {
  for (const key of ['media:content', 'media:thumbnail']) {
    const u = devPickUrl(it[key]); if (u) return u;
  }
  const enc = it['enclosure'];
  if (enc) { const u = devPickUrl(enc); if (u) return u; }
  for (const field of ['content:encoded', 'content', 'description', 'summary']) {
    const raw = devStr(it[field] ?? '');
    if (!raw) continue;
    const decoded = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    const m = decoded.match(/<img[^>]+src=["']([^"']+(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i)
           ?? decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

function devExtractLink(it: Record<string, unknown>, fallback: string): string {
  const raw = it.link;
  if (!raw) return devStr(it.guid ?? it.id) || fallback;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    const links = raw as Record<string, unknown>[];
    const alt = links.find(l => l['@_rel'] === 'alternate') ?? links.find(l => l['@_href']) ?? links[0];
    return devStr(alt?.['@_href'] ?? alt) || fallback;
  }
  const lo = raw as Record<string, unknown>;
  if (lo['@_href']) return String(lo['@_href']);
  return devStr(lo['__cdata'] ?? lo['#text'] ?? lo) || fallback;
}

function devParseItems(xml: string, sourceName: string): DevNewsItem[] {
  try {
    const parsed  = devXmlParser.parse(xml);
    const channel = parsed.rss?.channel ?? parsed.feed ?? {};
    const raw     = channel.item ?? channel.entry ?? [];
    const items: unknown[] = Array.isArray(raw) ? raw : [raw];
    return items.map((item: unknown, i: number) => {
      const it      = item as Record<string, unknown>;
      const title   = devStripHtml(devStr(it.title), 200);
      const link    = devExtractLink(it, `${sourceName}-${i}`);
      const pubDate = devStr(it.pubDate ?? it.published ?? it.updated) || new Date().toISOString();
      const rawDesc        = devStr(it.description ?? it.summary ?? '');
      const contentEncoded = devStr(it['content:encoded'] ?? it.content ?? '');
      const fullRaw        = contentEncoded || rawDesc;
      return {
        id:              devStr(it.guid ?? it.id) || `${sourceName}-${i}`,
        title,
        description:     devStripHtml(rawDesc, 260),
        fullDescription: devStripHtml(fullRaw, 3000),
        link,
        pubDate,
        thumbnail:       devExtractThumbnail(it),
        source:          sourceName,
      };
    }).filter(item => item.title && item.link);
  } catch { return []; }
}

/* ── Dev sitemap scraper (mirrors api/news.ts fetchFromSitemap) ── */

function devSlugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function devExtractOgMeta(html: string, prop: string): string | null {
  return html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'))?.[1]
    ?? null;
}

async function devFetchFromSitemap(
  sitemapUrl: string,
  sourceName: string,
  limit: number,
  urlFilter: (url: string) => boolean,
  sortByDate: boolean,
): Promise<DevNewsItem[]> {
  try {
    const sRes = await fetch(sitemapUrl, {
      headers: { 'User-Agent': HEADERS['User-Agent'] },
      signal: AbortSignal.timeout(8000),
    });
    if (!sRes.ok) return [];
    const xml = await sRes.text();

    const urls: { loc: string; lastmod: string }[] = [];
    const blockRe = /<url>([\s\S]*?)<\/url>/gi;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(xml)) !== null) {
      const block   = bm[1];
      const loc     = block.match(/<loc>\s*([^\s<]+)\s*<\/loc>/i)?.[1]?.trim();
      const lastmod = block.match(/<lastmod>\s*([^\s<]+)\s*<\/lastmod>/i)?.[1]?.trim() ?? '';
      if (loc && urlFilter(loc)) urls.push({ loc, lastmod });
      if (urls.length >= 60) break;
    }

    if (sortByDate) urls.sort((a, b) => b.lastmod.localeCompare(a.lastmod));

    const recent = urls.slice(0, limit);

    const items = await Promise.all(recent.map(async ({ loc, lastmod }) => {
      try {
        const r = await fetch(loc, {
          headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'text/html' },
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) return null;
        const text    = await r.text();
        const headEnd = text.indexOf('</head>');
        const head    = headEnd > 0 ? text.slice(0, headEnd + 7) : text.slice(0, 32768);

        const slug    = loc.split('/').filter(Boolean).pop() ?? '';
        const ogTitle = devExtractOgMeta(head, 'og:title')
                     ?? head.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
                     ?? devSlugToTitle(slug);
        const ogDesc  = devExtractOgMeta(head, 'og:description')
                     ?? head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
                     ?? '';
        const ogImage = devExtractOgMeta(head, 'og:image') ?? undefined;
        const pubRaw  = devExtractOgMeta(head, 'article:published_time');
        const pubDate = pubRaw
          ? new Date(pubRaw).toUTCString()
          : lastmod ? new Date(lastmod).toUTCString() : new Date().toUTCString();

        const title = devStripHtml(ogTitle, 200);
        if (!title) return null;

        return {
          id:              `${sourceName.toLowerCase().replace(/\s+/g, '-')}-${slug.slice(0, 30)}`,
          title,
          description:     devStripHtml(ogDesc, 260),
          fullDescription: devStripHtml(ogDesc, 3000),
          link:            loc,
          pubDate,
          thumbnail:       ogImage,
          source:          sourceName,
        };
      } catch { return null; }
    }));

    return items.filter((i): i is DevNewsItem => i !== null);
  } catch { return []; }
}

const DEV_SITEMAP_SOURCES = [
  {
    name:     'Coelho News',
    sitemap:  'https://coelhonews.com/sitemap-noticias-rss.xml',
    filter:   (u: string) => u.includes('/noticias/'),
    sortable: true,
  },
  {
    name:     'CanalDigplay',
    sitemap:  'https://www.canaldigplay.com/sitemap.xml',
    filter:   (u: string) => {
      const slug = u.replace('https://www.canaldigplay.com/', '').replace(/\/$/, '');
      const STATIC = new Set(['home','sobredigplay','digawards','digawardsvota','digofertas']);
      return slug.length > 10 && !STATIC.has(slug) && !slug.includes('/');
    },
    sortable: false,
  },
];

async function fetchDevNews(page: number): Promise<DevNewsItem[]> {
  const feedUrl = (base: string) =>
    page <= 1 ? base : `${base}${base.includes('?') ? '&' : '?'}paged=${page}`;

  // Standard RSS sources
  const rssResults = await Promise.allSettled(
    AI_SOURCES.map(async src => {
      const r = await fetch(feedUrl(src.url), {
        headers: { 'User-Agent': HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return [] as DevNewsItem[];
      return devParseItems(await r.text(), src.name);
    })
  );

  // Sitemap-based sources — only page 1
  const sitemapResults = page === 1
    ? await Promise.allSettled(
        DEV_SITEMAP_SOURCES.map(src =>
          devFetchFromSitemap(src.sitemap, src.name, 8, src.filter, src.sortable)
        )
      )
    : [];

  const seen = new Set<string>();
  return [
    ...rssResults
      .filter((r): r is PromiseFulfilledResult<DevNewsItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value),
    ...sitemapResults
      .filter((r): r is PromiseFulfilledResult<DevNewsItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value),
  ]
    .filter(item => { if (seen.has(item.link)) return false; seen.add(item.link); return true; })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

// Dev in-memory cache (30 min)
let devSummaryCache: { ts: number; data: object } | null = null;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nintendo-api',
      configureServer(server) {
        server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (!req.url?.startsWith('/api/')) return next();

          const url = new URL(req.url, 'http://localhost');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          try {
            /* ── /api/ai-summary ── */
            if (url.pathname === '/api/ai-summary') {
              const now = Date.now();
              if (devSummaryCache && now - devSummaryCache.ts < 30 * 60 * 1000) {
                return res.end(JSON.stringify(devSummaryCache.data));
              }
              const articles  = await fetchAIArticles();
              const aiResult  = await generateDevAISummary(articles);
              const summary   = aiResult ?? (articles.length >= 2 ? extractiveFallback(articles) : null);
              const data      = { summary, articles, generatedAt: new Date().toISOString() };
              devSummaryCache = { ts: now, data };
              return res.end(JSON.stringify(data));
            }

            /* ── /api/article ── */
            if (url.pathname === '/api/article') {
              const artUrl = url.searchParams.get('url') ?? '';
              if (!artUrl.startsWith('http')) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Invalid url' }));
              }
              try {
                const r = await fetch(artUrl, {
                  headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'text/html' },
                  signal: AbortSignal.timeout(10000),
                });
                if (!r.ok) {
                  res.statusCode = r.status;
                  return res.end(JSON.stringify({ error: `Upstream ${r.status}` }));
                }
                const html = await r.text();
                const result = devExtractArticle(html);
                return res.end(JSON.stringify(result));
              } catch (err) {
                res.statusCode = 502;
                return res.end(JSON.stringify({ error: String(err) }));
              }
            }

            /* ── /api/thumbnail ── */
            if (url.pathname === '/api/thumbnail') {
              const thumbUrl = url.searchParams.get('url') ?? '';
              if (!thumbUrl.startsWith('http')) {
                return res.end(JSON.stringify({ image: null }));
              }
              try {
                const r = await fetch(thumbUrl, {
                  headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'text/html,application/xhtml+xml' },
                  signal: AbortSignal.timeout(8000),
                });
                if (!r.ok) return res.end(JSON.stringify({ image: null }));
                const text = await r.text();
                const headEnd = text.indexOf('</head>');
                const head    = headEnd > 0 ? text.slice(0, headEnd + 7) : text.slice(0, 32768);
                const image   =
                  head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
                  head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
                  null;
                return res.end(JSON.stringify({ image }));
              } catch {
                return res.end(JSON.stringify({ image: null }));
              }
            }

            /* ── /api/news ── */
            if (url.pathname === '/api/news') {
              const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
              const items = await fetchDevNews(page);
              return res.end(JSON.stringify(items));
            }

            /* ── /api/enrichment ── */
            if (url.pathname === '/api/enrichment') {
              const title = url.searchParams.get('title') ?? '';
              const data  = await fetchEnrichment(title);
              return res.end(JSON.stringify(data));
            }

            /* ── /api/nintendo ── */
            if (url.pathname === '/api/nintendo') {
              const type       = url.searchParams.get('type')     ?? 'sales';
              const q          = url.searchParams.get('q')        ?? '';
              const limit      = Number(url.searchParams.get('limit')   ?? '24');
              const offset     = Number(url.searchParams.get('offset')  ?? '0');
              const platform   = url.searchParams.get('platform') ?? 'all';
              const id         = url.searchParams.get('id')       ?? '';
              const clientSort = url.searchParams.get('sort')     ?? '';

              if (type === 'detail') {
                const game = await fetchDetail(id);
                return res.end(JSON.stringify({ game }));
              }

              const needsFullSort = ['price-asc', 'price-desc', 'discount'].includes(clientSort);
              const data = needsFullSort && type !== 'coming-soon'
                ? await fetchAllAndSortByAU(type, q, limit, offset, platform, clientSort)
                : await fetchList(type, q, limit, offset, platform, clientSort);
              return res.end(JSON.stringify(data));
            }

            next();
          } catch (err) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Fetch failed', message: String(err) }));
          }
        });
      },
    },
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
