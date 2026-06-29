import { Search, RefreshCw, Gamepad2, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useGames } from '../hooks/useGames';
import { useFavorites } from '../hooks/useFavorites';
import { useLang } from '../contexts/LangContext';
import { t } from '../lib/i18n';
import { GameCard, GameCardSkeleton } from '../components/games/GameCard';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import type { GameTab, SortOption, PlatformFilter } from '../types';

function timeLabel(d: Date | null, lang: 'pt' | 'en') {
  if (!d) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1)  return t('now', lang);
  if (diff < 60) return `${diff}m`;
  return `${Math.floor(diff / 60)}h`;
}

export default function GamesPage() {
  const { lang } = useLang();
  const { games, total, loading, loadingMore, error, lastUpdated, tab, setTab, sort, setSort, query, setQuery, platform, setPlatform, hasMore, loadMore, refresh } = useGames();
  const { isFav, toggle } = useFavorites();
  const [showSort, setShowSort] = useState(false);
  const [inputVal, setInputVal] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(inputVal), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputVal, setQuery]);

  const sentinelRef = useIntersectionObserver(loadMore, hasMore && !loading && !loadingMore);

  const TABS: { value: GameTab; key: 'tab_sale' | 'tab_new' | 'tab_popular' | 'tab_all' | 'tab_coming_soon' }[] = [
    { value: 'sales',        key: 'tab_sale'        },
    { value: 'new',          key: 'tab_new'         },
    { value: 'popular',      key: 'tab_popular'     },
    { value: 'all',          key: 'tab_all'         },
    { value: 'coming-soon',  key: 'tab_coming_soon' },
  ];

  const PLATFORMS: { value: PlatformFilter; key: 'platform_all' | 'platform_switch1' | 'platform_switch2' }[] = [
    { value: 'all',     key: 'platform_all'     },
    { value: 'switch1', key: 'platform_switch1' },
    { value: 'switch2', key: 'platform_switch2' },
  ];

  const SORTS: { value: SortOption; key: 'sort_default' | 'sort_discount' | 'sort_price_asc' | 'sort_price_desc' | 'sort_name' }[] = [
    { value: 'default',    key: 'sort_default'    },
    { value: 'discount',   key: 'sort_discount'   },
    { value: 'price-asc',  key: 'sort_price_asc'  },
    { value: 'price-desc', key: 'sort_price_desc' },
    { value: 'name',       key: 'sort_name'       },
  ];

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">{t('games_title', lang)}</h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            {t('games_subtitle', lang)}
            {!loading && total > 0 && (
              <span className="text-ink-muted"> · {games.length} / {total}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-ink-muted hidden sm:block">{timeLabel(lastUpdated, lang)}</span>
          )}
          <button onClick={refresh} disabled={loading} className="btn-ghost" aria-label={t('refresh', lang)}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder={t('games_search', lang)}
          className="w-full pl-9 pr-9 py-2.5 bg-surface-card border border-edge-subtle rounded-xl text-sm
                     text-ink-primary placeholder:text-ink-muted
                     focus:outline-none focus:border-ember-300 focus:ring-2 focus:ring-ember-500/15
                     transition-all duration-150"
        />
        {inputVal && (
          <button onClick={() => { setInputVal(''); setQuery(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Platform filter */}
      <div className="flex gap-2 mb-4">
        {PLATFORMS.map(p => (
          <button
            key={p.value}
            onClick={() => setPlatform(p.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150
              ${platform === p.value
                ? p.value === 'switch2'
                  ? 'bg-violet-500 text-white shadow-soft'
                  : 'bg-ink-primary text-white shadow-soft'
                : 'bg-surface-secondary text-ink-secondary hover:bg-surface-card hover:text-ink-primary'
              }`}>
            {t(p.key, lang)}
          </button>
        ))}
      </div>

      {/* Tabs + Sort — only show when not searching */}
      {!query && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {TABS.map(tt => (
              <button
                key={tt.value}
                onClick={() => setTab(tt.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150
                  ${tab === tt.value
                    ? 'bg-ember-500 text-white shadow-soft'
                    : 'bg-surface-secondary text-ink-secondary hover:bg-surface-card hover:text-ink-primary'
                  }`}>
                {t(tt.key, lang)}
              </button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setShowSort(v => !v)} className="btn-ghost text-xs">
              <SlidersHorizontal size={12} />
              <span className="hidden sm:block">{t(SORTS.find(s => s.value === sort)?.key ?? 'sort_default', lang)}</span>
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-2 z-20 bg-surface-card border border-edge-subtle rounded-xl shadow-elevated overflow-hidden min-w-[170px]">
                {SORTS.map(s => (
                  <button key={s.value} onClick={() => { setSort(s.value); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors duration-100
                      ${sort === s.value ? 'text-ember-500 bg-ember-50' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink-primary'}`}>
                    {t(s.key, lang)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search label */}
      {query && !loading && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm text-ink-secondary">
            {t('search_results_for', lang)} <strong className="text-ink-primary">"{query}"</strong>
          </span>
          {games.length > 0 && (
            <span className="text-xs text-ink-muted">— {games.length} {lang === 'pt' ? 'jogos' : 'games'}</span>
          )}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl bg-ember-50 border border-ember-200 p-5 mb-6 text-sm text-ember-700">{error}</div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
        </div>
      ) : games.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {games.map(game => (
              <GameCard key={game.id} game={game} isFav={isFav(game.id)} onToggleFav={(id, g) => toggle(id, g)} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-8 mt-4" />

          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-ink-muted" />
            </div>
          )}

          {!hasMore && games.length > 0 && (
            <p className="text-center text-xs text-ink-muted py-6">
              {lang === 'pt' ? `— ${total} jogos carregados —` : `— ${total} games loaded —`}
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-ink-muted">
          <Gamepad2 size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {query ? `${lang === 'pt' ? 'Nenhum resultado para' : 'No results for'} "${query}"` : t('no_games', lang)}
          </p>
          {query && (
            <button onClick={() => { setInputVal(''); setQuery(''); }}
              className="text-xs text-ember-500 mt-2 hover:underline">
              {t('clear_search', lang)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
