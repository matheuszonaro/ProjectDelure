import { RefreshCw, Rss, Loader2, LayoutGrid, List } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { useNews } from '../hooks/useNews';
import { useLang } from '../contexts/LangContext';
import { t } from '../lib/i18n';
import { FeaturedNewsCard, NewsCard, NewsCardSkeleton, NewsListItem } from '../components/news/NewsCard';
import { NewsModal } from '../components/news/NewsModal';
import { AISummaryCard } from '../components/news/AISummaryCard';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { getReadLinks, markRead } from '../lib/readArticles';
import { getNewsSources } from '../lib/settings';
import { SOURCE_COLORS, timeAgo as _timeAgo } from '../lib/newsUtils';
import type { NewsItem } from '../types';

// ── View-mode persistence ───────────────────────────────────────────
const VIEW_KEY = 'delure:view-mode';
const getPersistedView = (): 'grid' | 'list' =>
  (localStorage.getItem(VIEW_KEY) as 'grid' | 'list') ?? 'grid';

// ── Time label for header ───────────────────────────────────────────
function timeLabel(d: Date | null, lang: 'pt' | 'en') {
  if (!d) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1)  return t('now', lang);
  if (diff < 60) return `${t('updated', lang)} há ${diff}m`;
  return `${t('updated', lang)} há ${Math.floor(diff / 60)}h`;
}

// content-visibility: auto — skip paint/layout for offscreen cards
const CV_STYLE: React.CSSProperties = {
  contentVisibility: 'auto',
  containIntrinsicSize: '0 380px',
};

export default function HomePage() {
  const { lang } = useLang();
  const { news, loading, loadingMore, error, lastUpdated, hasMore, refresh, loadMore } = useNews();
  const [modalItem, setModalItem] = useState<NewsItem | null>(null);

  // Read state
  const [readLinks, setReadLinks] = useState<Set<string>>(() => getReadLinks());

  // View mode — persisted to localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getPersistedView);

  // Active source filter — null = show all
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const handleOpenModal = useCallback((item: NewsItem) => {
    markRead(item.link);
    setReadLinks(getReadLinks());
    setModalItem(item);
  }, []);

  const handleViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem(VIEW_KEY, mode);
  }, []);

  const handleSourceFilter = useCallback((source: string | null) => {
    setActiveSource(prev => (prev === source ? null : source));
  }, []);

  // Sources that actually appear in the current feed
  const availableSources = useMemo(() => {
    if (news.length === 0) return [];
    const inFeed = new Set(news.map(n => n.source));
    return getNewsSources()
      .filter(s => inFeed.has(s.name))
      .map(s => s.name);
  }, [news]);

  // Apply source filter
  const filteredNews = useMemo(() => {
    if (!activeSource) return news;
    return news.filter(n => n.source === activeSource);
  }, [news, activeSource]);

  const sentinelRef = useIntersectionObserver(loadMore, hasMore && !loading);

  const featured  = filteredNews[0];
  const secondary = filteredNews.slice(1, 3);
  const rest      = filteredNews.slice(3);

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">{t('news_title', lang)}</h1>
          <p className="text-sm text-ink-secondary mt-0.5">{t('news_subtitle', lang)}</p>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-ink-muted hidden sm:block">{timeLabel(lastUpdated, lang)}</span>
          )}

          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-edge-subtle bg-surface-secondary shadow-soft">
            <button
              onClick={() => handleViewMode('grid')}
              aria-label="Grade"
              className={`px-2.5 py-2 transition-colors duration-150
                ${viewMode === 'grid'
                  ? 'bg-surface-card text-ink-primary shadow-[inset_0_0_0_1px_rgba(28,25,23,0.07)]'
                  : 'text-ink-muted hover:text-ink-secondary'}`}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => handleViewMode('list')}
              aria-label="Lista"
              className={`px-2.5 py-2 transition-colors duration-150
                ${viewMode === 'list'
                  ? 'bg-surface-card text-ink-primary shadow-[inset_0_0_0_1px_rgba(28,25,23,0.07)]'
                  : 'text-ink-muted hover:text-ink-secondary'}`}
            >
              <List size={13} />
            </button>
          </div>

          <button onClick={refresh} disabled={loading} className="btn-ghost" aria-label={t('refresh', lang)}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:block">{t('refresh', lang)}</span>
          </button>
        </div>
      </div>

      {/* ── Source filter chips ─────────────────────────────────── */}
      {!loading && availableSources.length > 1 && (
        <div className="flex items-center gap-1.5 mb-6 flex-wrap">
          {/* "All" chip */}
          <button
            onClick={() => setActiveSource(null)}
            className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all duration-150
              ${!activeSource
                ? 'bg-ink-primary text-ink-inverted border-ink-primary'
                : 'bg-surface-secondary text-ink-secondary border-edge-subtle hover:border-edge-medium hover:text-ink-primary'}`}
          >
            {lang === 'pt' ? 'Todas' : 'All'}
          </button>

          {availableSources.map(source => {
            const color = SOURCE_COLORS[source] ?? '#E07A45';
            const isActive = activeSource === source;
            return (
              <button
                key={source}
                onClick={() => handleSourceFilter(source)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all duration-150 flex items-center gap-1.5
                  ${isActive
                    ? 'border-transparent text-white'
                    : 'bg-surface-secondary text-ink-secondary border-edge-subtle hover:border-edge-medium hover:text-ink-primary'}`}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
              >
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                )}
                {source}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────── */}
      {error && !loading && (
        <div className="rounded-2xl bg-ember-50 border border-ember-200 p-5 mb-6 text-sm text-ember-700">{error}</div>
      )}

      {/* ── AI Summary ─────────────────────────────────────────── */}
      <div className="mb-6">
        <AISummaryCard />
      </div>

      {/* ══════════════════════════════════════════════════════════
          GRID MODE
      ══════════════════════════════════════════════════════════ */}
      {viewMode === 'grid' && (
        <>
          {/* Skeletons */}
          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-2"><NewsCardSkeleton featured /></div>
              <div className="space-y-4"><NewsCardSkeleton /><NewsCardSkeleton /></div>
            </div>
          )}

          {/* Featured + secondary */}
          {!loading && featured && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-2" style={CV_STYLE}>
                <FeaturedNewsCard item={featured} onOpenModal={handleOpenModal} isRead={readLinks.has(featured.link)} />
              </div>
              <div className="space-y-4">
                {secondary.map(item => (
                  <div key={item.id} style={CV_STYLE}>
                    <NewsCard item={item} onOpenModal={handleOpenModal} isRead={readLinks.has(item.link)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rest */}
          {!loading && rest.length > 0 && (
            <>
              <div className="flex items-center gap-2 my-6">
                <Rss size={13} className="text-ink-muted" />
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-widest">
                  {t('more_news', lang)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map(item => (
                  <div key={item.id} style={CV_STYLE}>
                    <NewsCard item={item} onOpenModal={handleOpenModal} isRead={readLinks.has(item.link)} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty filtered state */}
          {!loading && filteredNews.length === 0 && news.length > 0 && activeSource && (
            <div className="text-center py-16 text-ink-muted">
              <p className="text-sm">
                {lang === 'pt'
                  ? `Nenhum artigo de "${activeSource}" ainda.`
                  : `No articles from "${activeSource}" yet.`}
              </p>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          LIST MODE
      ══════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <>
          {/* Skeletons */}
          {loading && (
            <div className="rounded-2xl border border-edge-subtle overflow-hidden bg-surface-card shadow-card divide-y divide-edge-subtle">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                  <div className="w-[3px] h-9 rounded-full bg-edge-subtle shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-edge-subtle rounded w-3/4" />
                    <div className="h-2.5 bg-edge-subtle rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List items */}
          {!loading && filteredNews.length > 0 && (
            <div className="rounded-2xl border border-edge-subtle overflow-hidden bg-surface-card shadow-card divide-y divide-edge-subtle">
              {filteredNews.map(item => (
                <NewsListItem
                  key={item.id}
                  item={item}
                  onOpenModal={handleOpenModal}
                  isRead={readLinks.has(item.link)}
                />
              ))}
            </div>
          )}

          {/* Empty filtered state */}
          {!loading && filteredNews.length === 0 && news.length > 0 && activeSource && (
            <div className="text-center py-16 text-ink-muted">
              <p className="text-sm">
                {lang === 'pt'
                  ? `Nenhum artigo de "${activeSource}" ainda.`
                  : `No articles from "${activeSource}" yet.`}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Infinite scroll sentinel ──────────────────────────── */}
      <div ref={sentinelRef} className="h-8 mt-4" />

      {loadingMore && (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      )}

      {!loading && !hasMore && news.length > 0 && (
        <p className="text-center text-xs text-ink-muted py-6">
          {lang === 'pt' ? '— Você viu tudo por agora —' : '— You\'re all caught up —'}
        </p>
      )}

      {!loading && news.length === 0 && !error && (
        <div className="text-center py-20 text-ink-muted">
          <Rss size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('no_news', lang)}</p>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────── */}
      {modalItem && (
        <NewsModal item={modalItem} onClose={() => setModalItem(null)} />
      )}
    </div>
  );
}
