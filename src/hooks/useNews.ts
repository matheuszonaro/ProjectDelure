import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchNews } from '../lib/api';
import type { NewsItem } from '../types';

const PAGE_SIZE  = 12;
const MAX_EMPTY  = 3;
const REFRESH_MS = 15 * 60 * 1000;

export function useNews() {
  const [visible,     setVisible]  = useState<NewsItem[]>([]);
  const [loading,     setLoading]  = useState(true);
  const [loadingMore, setMore]     = useState(false);
  const [error,       setError]    = useState<string | null>(null);
  const [lastUpdated, setUpd]      = useState<Date | null>(null);
  const [hasMore,     setHasMore]  = useState(true);

  const bufferRef     = useRef<NewsItem[]>([]);
  const seenRef       = useRef<Set<string>>(new Set());
  const rssPageRef    = useRef(1);
  const emptyPagesRef = useRef(0);
  const fetchingRef   = useRef(false);
  // Generation counter — incremented on every hard reset so stale fetches
  // (e.g. from React StrictMode's double-invoke) are silently discarded.
  const loadGenRef    = useRef(0);

  const addUniq = useCallback((items: NewsItem[]): NewsItem[] =>
    items.filter(item => {
      if (seenRef.current.has(item.link)) return false;
      seenRef.current.add(item.link);
      return true;
    }),
  []);

  const byDate = (a: NewsItem, b: NewsItem) => {
    const ta = new Date(a.pubDate).getTime();
    const tb = new Date(b.pubDate).getTime();
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return tb - ta;
  };

  /**
   * Load / refresh the news feed.
   *
   * silent = false  Hard reset — clears state, shows skeleton.
   *                 Used for initial load and the manual "Refresh" button.
   *
   * silent = true   Background merge — fetches page 1 again and prepends only
   *                 genuinely new items to the top of the existing list, without
   *                 clearing visible items or disrupting scroll position.
   *                 Used by the 15-minute auto-refresh interval.
   */
  const load = useCallback(async (silent = false) => {
    if (silent && fetchingRef.current) return; // don't interrupt an ongoing load
    fetchingRef.current = true;

    // Bump generation for hard resets so any in-flight stale fetch can detect
    // it has been superseded and bail before touching shared state.
    if (!silent) loadGenRef.current++;
    const myGen = loadGenRef.current;

    if (!silent) {
      setLoading(true);
      setError(null);
      bufferRef.current     = [];
      seenRef.current       = new Set();
      rssPageRef.current    = 1;
      emptyPagesRef.current = 0;
    }

    try {
      const data = await fetchNews(1);

      // Stale check — MUST happen before addUniq so seenRef stays clean.
      // Triggered by React StrictMode's double-invoke or rapid manual refreshes.
      if (!silent && myGen !== loadGenRef.current) return;

      // addUniq deduplicates against seenRef — for silent mode this yields only
      // articles that weren't already visible, i.e. genuinely new ones.
      const fresh = addUniq(data).sort(byDate);

      if (silent) {
        if (fresh.length > 0) {
          const toShow = fresh.slice(0, PAGE_SIZE);
          bufferRef.current = [...fresh.slice(PAGE_SIZE), ...bufferRef.current];
          setVisible(prev => [...toShow, ...prev]);
          setUpd(new Date());
        }
      } else {
        const toShow = fresh.slice(0, PAGE_SIZE);
        bufferRef.current = fresh.slice(PAGE_SIZE);
        setVisible(toShow);
        setHasMore(fresh.length > 0);
        setUpd(new Date());
      }
    } catch {
      if (!silent && myGen === loadGenRef.current) {
        setError('Não foi possível carregar as notícias.');
        setHasMore(false);
      }
    } finally {
      // Only the winning generation turns off the loading skeleton.
      if (!silent && myGen === loadGenRef.current) setLoading(false);
      fetchingRef.current = false;
    }
  }, [addUniq]);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setMore(true);

    try {
      if (bufferRef.current.length >= PAGE_SIZE) {
        const next = bufferRef.current.splice(0, PAGE_SIZE);
        setVisible(prev => [...prev, ...next]);
        setHasMore(true);
        return;
      }

      if (emptyPagesRef.current >= MAX_EMPTY) {
        const last = bufferRef.current.splice(0);
        if (last.length > 0) setVisible(prev => [...prev, ...last]);
        setHasMore(false);
        return;
      }

      rssPageRef.current++;
      const data  = await fetchNews(rssPageRef.current);
      const fresh = addUniq(data);

      if (fresh.length === 0) {
        emptyPagesRef.current++;
        if (emptyPagesRef.current >= MAX_EMPTY) {
          const last = bufferRef.current.splice(0);
          if (last.length > 0) setVisible(prev => [...prev, ...last]);
          setHasMore(false);
        }
        return;
      }

      emptyPagesRef.current = 0;
      const combined = [...bufferRef.current, ...fresh].sort(byDate);
      const toShow   = combined.splice(0, PAGE_SIZE);
      bufferRef.current = combined;
      setVisible(prev => [...prev, ...toShow]);
      setHasMore(true);
    } catch {
      setHasMore(false);
    } finally {
      setMore(false);
      fetchingRef.current = false;
    }
  }, [addUniq]);

  useEffect(() => {
    load(false);                                            // initial hard load
    const id = setInterval(() => load(true), REFRESH_MS);  // silent background refresh
    return () => clearInterval(id);
  }, [load]);

  return {
    news:        visible,
    loading,
    loadingMore,
    error,
    lastUpdated,
    hasMore,
    refresh:     () => load(false),  // manual refresh button → hard reset
    loadMore,
  };
}
