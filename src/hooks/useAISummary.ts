import { useState, useEffect } from 'react';

/* ── Types (mirror api/ai-summary.ts — kept local to avoid Vercel import) ── */
export interface SummaryArticle {
  title: string; description: string; link: string;
  pubDate: string; source: string; thumbnail?: string;
}

export interface AISummaryResponse {
  summary:     { en: string; pt: string } | null;
  articles:    SummaryArticle[];
  generatedAt: string;
}

interface State {
  summary:     { en: string; pt: string } | null;
  articles:    SummaryArticle[];
  loading:     boolean;
  generatedAt: string | null;
}

// Module-level cache — lives in JS memory, cleared on every full page reload.
// Unlike sessionStorage, this means a reload always triggers a fresh server fetch,
// while normal SPA navigation (tab switching) reuses the in-memory result.
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let _memCache: { ts: number; data: AISummaryResponse } | null = null;

function readCache(): AISummaryResponse | null {
  if (!_memCache) return null;
  if (Date.now() - _memCache.ts > CACHE_TTL) { _memCache = null; return null; }
  return _memCache.data;
}

function writeCache(data: AISummaryResponse) {
  _memCache = { ts: Date.now(), data };
}

export function useAISummary(): State {
  const [state, setState] = useState<State>({
    summary: null, articles: [], loading: true, generatedAt: null,
  });

  useEffect(() => {
    // Serve from in-memory cache during SPA navigation (skipped on page reload)
    const cached = readCache();
    if (cached) {
      setState({ summary: cached.summary, articles: cached.articles, loading: false, generatedAt: cached.generatedAt });
      return;
    }

    let cancelled = false;
    setState(s => ({ ...s, loading: true }));

    fetch('/api/ai-summary', { signal: AbortSignal.timeout(50000) })
      .then(r => r.ok ? r.json() as Promise<AISummaryResponse> : null)
      .then(data => {
        if (cancelled || !data) return;
        setState({ summary: data.summary, articles: data.articles, loading: false, generatedAt: data.generatedAt });
        writeCache(data);
      })
      .catch(() => { /* silent — card won't render */ })
      .finally(() => { if (!cancelled) setState(s => ({ ...s, loading: false })); });

    return () => { cancelled = true; };
  }, []);

  return state;
}
