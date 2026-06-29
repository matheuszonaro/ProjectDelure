import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchGames, searchGames } from '../lib/api';
import type { Game, GameTab, SortOption, PlatformFilter } from '../types';

const PAGE = 24;

export function useGames() {
  const [games,     setGames]    = useState<Game[]>([]);
  const [total,     setTotal]    = useState(0);
  const [loading,   setLoading]  = useState(true);
  const [moreLoad,  setMoreLoad] = useState(false);
  const [error,     setError]    = useState<string | null>(null);
  const [lastUpdated, setUpd]    = useState<Date | null>(null);
  const [tab,       setTab]      = useState<GameTab>('sales');
  const [sort,      setSort]     = useState<SortOption>('default');
  const [query,     setQuery]    = useState('');
  const [platform,  setPlatform] = useState<PlatformFilter>('all');
  const offsetRef = useRef(0);

  const doFetch = useCallback(async (
    t: GameTab, q: string, offset: number, append: boolean,
    plat: PlatformFilter, clientSort: SortOption,
  ) => {
    if (offset === 0) setLoading(true);
    else setMoreLoad(true);
    setError(null);
    try {
      const result = q.trim()
        ? await searchGames(q, PAGE, offset, plat, clientSort)
        : await fetchGames(t, PAGE, offset, plat, clientSort);
      setGames(prev => append ? [...prev, ...result.games] : result.games);
      setTotal(result.total);
      setUpd(new Date());
    } catch {
      setError('Não foi possível carregar os jogos.');
    } finally {
      setLoading(false);
      setMoreLoad(false);
    }
  }, []);

  // Refetch whenever tab/query/platform/sort changes
  useEffect(() => {
    offsetRef.current = 0;
    doFetch(tab, query, 0, false, platform, sort);
  }, [tab, query, platform, sort, doFetch]);

  const loadMore = useCallback(() => {
    if (moreLoad || loading) return;
    if (games.length >= total && total > 0) return;
    offsetRef.current += PAGE;
    doFetch(tab, query, offsetRef.current, true, platform, sort);
  }, [moreLoad, loading, games.length, total, tab, query, platform, sort, doFetch]);

  const hasMore = total === 0 ? false : games.length < total;

  return {
    // games is already sorted server-side — return directly
    games, total, loading, loadingMore: moreLoad, error, lastUpdated,
    tab, setTab, sort, setSort, query, setQuery, platform, setPlatform,
    hasMore, loadMore,
    refresh: () => { offsetRef.current = 0; doFetch(tab, query, 0, false, platform, sort); },
  };
}
