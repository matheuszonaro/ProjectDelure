import { ExternalLink, Clock, Check } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { NewsItem } from '../../types';
import { useLang } from '../../contexts/LangContext';
import { t } from '../../lib/i18n';
import { translateText } from '../../lib/translate';
import { SOURCE_COLORS, timeAgo } from '../../lib/newsUtils';

// ── Lazy image hook ───────────────────────────────────────────────────
//
// State machine:
//   idle     → card not near viewport; shows source-colour gradient
//   fetching → IntersectionObserver fired, /api/thumbnail in flight; shows skeleton
//   done     → fetch complete (src may be null = no image)
//
// Once src is set the <img> mounts opacity-0 and fades in on onLoad.
// onError resets src → null so the gradient fallback re-appears cleanly.

type FetchState = 'idle' | 'fetching' | 'done';

function useLazyImage(item: NewsItem) {
  const [src, setSrc]               = useState<string | null>(item.thumbnail ?? null);
  const [loaded, setLoaded]         = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>(
    item.thumbnail ? 'done' : 'idle',
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetched   = useRef(!!item.thumbnail);

  useEffect(() => {
    setSrc(item.thumbnail ?? null);
    setLoaded(false);
    setFetchState(item.thumbnail ? 'done' : 'idle');
    hasFetched.current = !!item.thumbnail;
  }, [item.link, item.thumbnail]);

  useEffect(() => {
    if (item.thumbnail || hasFetched.current) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        hasFetched.current = true;
        setFetchState('fetching');
        fetch(`/api/thumbnail?url=${encodeURIComponent(item.link)}`)
          .then(r => r.ok ? (r.json() as Promise<{ image: string | null }>) : null)
          .then(data => { if (data?.image) setSrc(data.image); })
          .catch(() => {})
          .finally(() => setFetchState('done'));
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.thumbnail, item.link]);

  const onLoad  = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => { setSrc(null); setFetchState('done'); }, []);

  return {
    src,
    loaded,
    showSkeleton: fetchState === 'fetching' || (src !== null && !loaded),
    showGradient: src === null && fetchState !== 'fetching',
    containerRef,
    onLoad,
    onError,
  };
}

// ── Shared image area ─────────────────────────────────────────────────

interface ImageAreaProps {
  item:         NewsItem;
  aspect:       string;
  hoverScale?:  string;
  eagerLoad?:   boolean;
  badgeOffset?: string;
  isRead?:      boolean;
}

function ImageArea({
  item,
  aspect,
  hoverScale  = 'group-hover:scale-[1.04]',
  eagerLoad   = false,
  badgeOffset = 'top-3 left-3',
  isRead      = false,
}: ImageAreaProps) {
  const color = SOURCE_COLORS[item.source] ?? '#E07A45';
  const { src, loaded, showSkeleton, showGradient, containerRef, onLoad, onError } = useLazyImage(item);

  return (
    <div ref={containerRef} className={`relative w-full ${aspect} bg-surface-secondary overflow-hidden`}>
      {showGradient && (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}33 0%, ${color}10 100%)` }} />
      )}
      {showSkeleton && (
        <div className="absolute inset-0 bg-edge-subtle animate-pulse" />
      )}
      {src && (
        <img
          src={src}
          alt={item.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${hoverScale} ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={onLoad}
          onError={onError}
          loading={eagerLoad ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      {/* Dim overlay for read articles */}
      {isRead && <div className="absolute inset-0 bg-white/25 pointer-events-none" />}
      {/* Gradient for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      <div className={`absolute ${badgeOffset}`}>
        <SourceBadge source={item.source} />
      </div>
    </div>
  );
}

// ── Auto-translate hook ───────────────────────────────────────────────
// Fixed: doneRef prevents re-running; setXlating(false) is unconditional.

function useAutoTranslate(title: string, description: string) {
  const { lang } = useLang();
  const [ptTitle, setPtTitle] = useState<string | null>(null);
  const [ptDesc,  setPtDesc]  = useState<string | null>(null);
  const [xlating, setXlating] = useState(false);
  const doneRef = useRef(false);

  // Reset on content/language change
  useEffect(() => {
    doneRef.current = false;
    setPtTitle(null);
    setPtDesc(null);
  }, [lang, title, description]);

  // Translate once per unique (lang, title, description) combination
  useEffect(() => {
    if (lang !== 'pt' || doneRef.current) return;
    doneRef.current = true;
    let cancelled = false;
    setXlating(true);
    const tasks: Promise<void>[] = [
      translateText(title).then(r => { if (!cancelled) setPtTitle(r); }),
    ];
    if (description) {
      tasks.push(translateText(description).then(r => { if (!cancelled) setPtDesc(r); }));
    }
    // Unconditional — prevents spinner from getting stuck if the effect re-runs
    Promise.all(tasks).finally(() => setXlating(false));
    return () => { cancelled = true; };
  }, [lang, title, description]);

  return {
    displayTitle: lang === 'pt' ? (ptTitle ?? title)       : title,
    displayDesc:  lang === 'pt' ? (ptDesc  ?? description) : description,
    xlating,
  };
}

// ── SourceBadge ───────────────────────────────────────────────────────

export function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? '#78716C';
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ color, backgroundColor: color + '18' }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {source}
    </span>
  );
}

// ── CardProps ─────────────────────────────────────────────────────────

interface CardProps {
  item:         NewsItem;
  onOpenModal?: (item: NewsItem) => void;
  isRead?:      boolean;
}

// ── FeaturedNewsCard ──────────────────────────────────────────────────

export function FeaturedNewsCard({ item, onOpenModal, isRead = false }: CardProps) {
  const { lang } = useLang();
  const { displayTitle, displayDesc, xlating } = useAutoTranslate(item.title, item.description);

  const handleClick = (e: React.MouseEvent) => {
    if (onOpenModal) { e.preventDefault(); onOpenModal(item); }
  };

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`card group animate-fade-in block focus:outline-none cursor-pointer transition-opacity ${isRead ? 'opacity-75' : ''}`}
    >
      <ImageArea item={item} aspect="aspect-[2/1]" hoverScale="group-hover:scale-[1.03]" eagerLoad badgeOffset="top-4 left-4" isRead={isRead} />

      <div className="p-5 lg:p-6">
        <div className="flex items-center gap-2 text-ink-muted text-xs mb-3">
          <Clock size={11} />
          <span>{timeAgo(item.pubDate, lang)}</span>
          {isRead && (
            <span className="flex items-center gap-0.5 text-[10px] text-ink-muted/50">
              <Check size={9} />
              {lang === 'pt' ? 'Lido' : 'Read'}
            </span>
          )}
          {xlating && (
            <span className="ml-auto text-[10px] text-ink-muted/60 italic">
              {lang === 'pt' ? 'traduzindo…' : ''}
            </span>
          )}
        </div>
        <h2 className={`text-lg font-bold leading-snug tracking-tight mb-2 group-hover:text-ember-600 transition-colors duration-150 ${xlating ? 'opacity-60' : ''} ${isRead ? 'text-ink-secondary' : 'text-ink-primary'}`}>
          {displayTitle}
        </h2>
        {displayDesc && (
          <p className={`text-sm text-ink-secondary leading-relaxed line-clamp-3 mb-4 ${xlating ? 'opacity-60' : ''}`}>
            {displayDesc}
          </p>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ember-500 group-hover:gap-2.5 transition-all duration-150">
          {t('read_article', lang)} <ExternalLink size={11} />
        </span>
      </div>
    </a>
  );
}

// ── NewsCard ──────────────────────────────────────────────────────────

export function NewsCard({ item, onOpenModal, isRead = false }: CardProps) {
  const { lang } = useLang();
  const { displayTitle, displayDesc, xlating } = useAutoTranslate(item.title, item.description);

  const handleClick = (e: React.MouseEvent) => {
    if (onOpenModal) { e.preventDefault(); onOpenModal(item); }
  };

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`card group animate-fade-in block focus:outline-none cursor-pointer transition-opacity ${isRead ? 'opacity-75' : ''}`}
    >
      <ImageArea item={item} aspect="aspect-[16/9]" hoverScale="group-hover:scale-[1.04]" badgeOffset="top-3 left-3" isRead={isRead} />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 text-xs text-ink-muted">
          <Clock size={10} />
          <span>{timeAgo(item.pubDate, lang)}</span>
          {isRead && (
            <span className="flex items-center gap-0.5 text-[10px] text-ink-muted/50">
              <Check size={9} />
              {lang === 'pt' ? 'Lido' : 'Read'}
            </span>
          )}
          {xlating && (
            <span className="ml-auto text-[10px] text-ink-muted/60 italic">
              {lang === 'pt' ? 'traduzindo…' : ''}
            </span>
          )}
        </div>
        <h3 className={`text-sm font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-ember-600 transition-colors duration-150 ${xlating ? 'opacity-60' : ''} ${isRead ? 'text-ink-secondary' : 'text-ink-primary'}`}>
          {displayTitle}
        </h3>
        {displayDesc && (
          <p className={`text-xs text-ink-secondary leading-relaxed line-clamp-2 ${xlating ? 'opacity-60' : ''}`}>
            {displayDesc}
          </p>
        )}
        <div className="flex items-center gap-1 mt-3 text-[11px] font-medium text-ember-500 opacity-0 group-hover:opacity-100 transition-opacity">
          {t('read_article', lang)} <ExternalLink size={10} />
        </div>
      </div>
    </a>
  );
}

// ── NewsListItem ──────────────────────────────────────────────────────
// Compact horizontal row used in "list" view mode.

export function NewsListItem({ item, onOpenModal, isRead = false }: CardProps) {
  const { lang } = useLang();
  const { displayTitle, xlating } = useAutoTranslate(item.title, item.description);
  const color = SOURCE_COLORS[item.source] ?? '#78716C';

  const handleClick = (e: React.MouseEvent) => {
    if (onOpenModal) { e.preventDefault(); onOpenModal(item); }
  };

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-surface-secondary cursor-pointer transition-colors group ${isRead ? 'opacity-60' : ''}`}
    >
      {/* Source colour bar */}
      <div
        className="w-[3px] h-9 rounded-full shrink-0"
        style={{ backgroundColor: color + '70' }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold line-clamp-1 leading-snug group-hover:text-ember-600 transition-colors duration-150
          ${xlating ? 'opacity-60' : ''} ${isRead ? 'text-ink-secondary' : 'text-ink-primary'}`}>
          {displayTitle}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-muted">
          <span className="font-semibold" style={{ color }}>{item.source}</span>
          <span className="opacity-40">·</span>
          <Clock size={9} />
          <span>{timeAgo(item.pubDate, lang)}</span>
          {isRead && (
            <span className="flex items-center gap-0.5 ml-1 opacity-60">
              <Check size={9} />
              {lang === 'pt' ? 'Lido' : 'Read'}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ExternalLink size={13} className="shrink-0 text-ink-muted/25 group-hover:text-ember-400 transition-colors" />
    </a>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────

export function NewsCardSkeleton({ featured = false }: { featured?: boolean }) {
  if (featured) {
    return (
      <div className="card animate-pulse overflow-hidden">
        <div className="aspect-[2/1] skeleton" />
        <div className="p-5 lg:p-6 space-y-3">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="card animate-pulse overflow-hidden">
      <div className="aspect-[16/9] skeleton" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded mt-1" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}
