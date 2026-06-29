/** Translation helpers with a global serialized queue.
 *
 * All calls to translateText() share a single promise chain and are
 * spaced at least 80 ms apart, preventing the burst of ~24 simultaneous
 * requests that fired when a full page of news cards mounted at once.
 *
 * getCachedTranslation() lets components check the cache synchronously so
 * they avoid re-showing the spinner for text that has already been translated.
 */

const cache = new Map<string, string>();
let _last  = 0;
let _chain: Promise<void> = Promise.resolve();

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

/** Append fn to the global chain; absorb errors so the chain never rejects. */
function enqueue(fn: () => Promise<void>): void {
  _chain = _chain
    .catch(() => {})
    .then(() => fn().catch(() => {}));
}

async function _fetchTranslation(text: string): Promise<string> {
  // ① Google Translate unofficial endpoint — no key, high reliability
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt-BR&dt=t&q=${encodeURIComponent(text.slice(0, 500))}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json() as [Array<[string, ...unknown[]]>, ...unknown[]];
      const translated = data[0]?.map(seg => String(seg[0] ?? '')).join('') ?? '';
      if (translated && translated !== text) return translated;
    }
  } catch { /* fall through */ }

  // ② MyMemory fallback
  try {
    const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|pt-BR`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json() as { responseData?: { translatedText?: string }; responseStatus?: number };
    const translated = data.responseData?.translatedText;
    if (translated && data.responseStatus === 200 && translated !== text) return translated;
  } catch { /* fall through */ }

  return text;
}

export async function translateText(text: string): Promise<string> {
  if (!text.trim()) return text;
  const key = text.slice(0, 250);
  if (cache.has(key)) return cache.get(key)!;

  // Serialize through the global queue, spacing calls by at least 80 ms
  return new Promise<string>((resolve) => {
    enqueue(async () => {
      // Re-check: another queued call may have already translated this text
      if (cache.has(key)) { resolve(cache.get(key)!); return; }

      const wait = Math.max(0, 80 - (Date.now() - _last));
      if (wait > 0) await delay(wait);
      _last = Date.now();

      const result = await _fetchTranslation(text);
      if (result !== text) cache.set(key, result);
      resolve(result);
    });
  });
}

/**
 * Synchronous cache check — use in components that re-mount to avoid
 * briefly showing the translation spinner when the result is already known.
 */
export function getCachedTranslation(text: string): string | null {
  const key = text.slice(0, 250);
  return cache.has(key) ? (cache.get(key) ?? null) : null;
}

/** Translate multiple strings in sequence through the shared queue. */
export async function translateBatch(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map(t => translateText(t)));
}
