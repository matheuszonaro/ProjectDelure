import type { VercelRequest, VercelResponse } from '@vercel/node';

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

/** Fetch AU prices for all NSUIDs in parallel batches of 50 */
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

/** Build a content row from doc + AU price for the list endpoint */
function buildContentRow(doc: EuDoc, nsuid: string, auPrice: AuPrice | undefined) {
  const sw2 = isSwitch2(doc);
  return {
    id: doc.fs_id, formal_name: doc.title,
    publisher: { name: doc.publisher ?? '' },
    genre: firstVal(doc.game_categories_txt),
    hero_banner_url: bestImage(doc), screenshots: [] as string[],
    platform: sw2 ? 'Switch 2' : 'Switch',
    nsuid,
    releaseDate: doc.pretty_date_s ?? firstVal(doc.dates_released_dts) ?? '',
    releaseDateIso: firstVal(doc.dates_released_dts) ?? '',
    price: auPrice?.regular_price ? {
      regular_price:  auPrice.regular_price,
      discount_price: auPrice.discount_price,
    } : undefined,
  };
}

/* ── Normal paginated list (default sort, or name sort via Solr) ── */
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

  // Only 'name' client-sort maps cleanly to Solr (same in EU and AU)
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
    .map(doc => buildContentRow(doc, nsuidMap.get(doc.fs_id) ?? '', nsuidMap.get(doc.fs_id) ? priceMap.get(nsuidMap.get(doc.fs_id)!) : undefined))
    .filter(c => c.formal_name && (needPrice ? (c.price?.regular_price?.raw_value ?? '0') !== '0' : true));

  return { contents, offset, total_number: euData.response.numFound };
}

/* ── Fetch all (up to 300) + sort by real AU price ─────────────── */
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

  // Build enriched list with AU sort keys
  const enriched = docs
    .map(doc => {
      const nsuid   = nsuidMap.get(doc.fs_id) ?? '';
      const auPrice = nsuid ? priceMap.get(nsuid) : undefined;
      const auOrig  = auPrice?.regular_price  ? parseFloat(auPrice.regular_price.raw_value)  : 0;
      const auCurr  = auPrice?.discount_price ? parseFloat(auPrice.discount_price.raw_value) : auOrig;
      const auDisc  = auOrig > 0 ? Math.round((1 - auCurr / auOrig) * 100) : 0;
      return {
        content:    buildContentRow(doc, nsuid, auPrice),
        auOrig, auCurr, auDisc,
      };
    })
    .filter(({ content, auOrig }) =>
      content.formal_name && (needPrice ? auOrig > 0 : true));

  // Sort by real AU metrics
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

/* ── Detail fetch ───────────────────────────────────────────────── */
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

  // Parse screenshots
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
    eshopUrl: eshopPath ? `https://www.nintendo.com${eshopPath}` : '',
    screenshotUrls,
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

/* ── Route handler ──────────────────────────────────────────────── */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const {
    type = 'sales', q = '', limit = '24', offset = '0',
    platform = 'all', id = '', sort: clientSort = '',
  } = req.query as Record<string, string>;

  try {
    if (type === 'detail') {
      const game = await fetchDetail(id);
      return res.json({ game });
    }

    // Price-based sorts require fetch-all to use real AU prices
    const needsFullSort = ['price-asc', 'price-desc', 'discount'].includes(clientSort);
    const data = needsFullSort && type !== 'coming-soon'
      ? await fetchAllAndSortByAU(type, q, Number(limit), Number(offset), platform, clientSort)
      : await fetchList(type, q, Number(limit), Number(offset), platform, clientSort);

    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Failed', message: error instanceof Error ? error.message : 'Unknown' });
  }
}
