import { X, ExternalLink, Clock, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { NewsItem } from '../../types';
import { useLang } from '../../contexts/LangContext';
import { translateText, getCachedTranslation } from '../../lib/translate';
import { SOURCE_COLORS, timeAgo } from '../../lib/newsUtils';

interface Props { item: NewsItem; onClose: () => void; }

export function NewsModal({ item, onClose }: Props) {
  const { lang } = useLang();

  // Full article state
  const [fullText,     setFullText]   = useState<string | null>(null);
  const [fetchedImage, setFetchedImg] = useState<string | null>(null);
  const [loadingFull,  setLoadingFull] = useState(true);

  // Translation state — seeded from module-level cache so re-opening the same
  // article never shows the spinner again (getCachedTranslation is synchronous).
  const [ptTitle, setPtTitle] = useState<string | null>(() =>
    lang === 'pt' ? getCachedTranslation(item.title) : null
  );
  const [ptBody,  setPtBody]  = useState<string | null>(null);
  const [xlating, setXlating] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Escape key + scroll lock ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // ── Fetch full article from source URL ───────────────────
  useEffect(() => {
    setFullText(null);
    setFetchedImg(null);
    // Keep cached translations across re-opens; only reset if item changes
    setPtTitle(lang === 'pt' ? getCachedTranslation(item.title) : null);
    setPtBody(null);
    setLoadingFull(true);

    if (!item.link) { setLoadingFull(false); return; }

    const ctrl = new AbortController();

    fetch(`/api/article?url=${encodeURIComponent(item.link)}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() as Promise<{ text: string; image?: string }> : null)
      .then(data => {
        if (data?.text && data.text.length > 80)  setFullText(data.text);
        if (data?.image)                           setFetchedImg(data.image);
      })
      .catch(() => { /* silent — fall back to RSS content */ })
      .finally(() => setLoadingFull(false));

    return () => ctrl.abort();
  }, [item.link, lang]);

  // ── Auto-translate once full content is resolved ────────
  // Waits for article fetch so we translate the best available text.
  // If the translation cache already has the result, the spinner never shows.
  useEffect(() => {
    if (lang !== 'pt' || loadingFull) return;

    const bodyText = (fullText ?? item.fullDescription ?? item.description ?? '').slice(0, 1500);

    // Check cache synchronously — skip the async spinner if already translated
    const cachedTitle = getCachedTranslation(item.title);
    const cachedBody  = bodyText ? getCachedTranslation(bodyText) : null;

    if (cachedTitle) setPtTitle(cachedTitle);
    if (cachedBody)  setPtBody(cachedBody);
    if (cachedTitle && (!bodyText || cachedBody)) return; // nothing to fetch

    let cancelled = false;
    setXlating(true);

    const tasks: Promise<void>[] = [];
    if (!cachedTitle) {
      tasks.push(translateText(item.title).then(r => { if (!cancelled) setPtTitle(r); }));
    }
    if (bodyText && !cachedBody) {
      tasks.push(translateText(bodyText).then(r => { if (!cancelled) setPtBody(r); }));
    }

    // Unconditional — prevents spinner from getting stuck on re-render
    Promise.all(tasks).finally(() => setXlating(false));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, item.link, loadingFull]);

  // ── Derived values ────────────────────────────────────────
  const displayImage = item.thumbnail ?? fetchedImage;
  const title        = lang === 'pt' ? (ptTitle ?? item.title) : item.title;
  const rawBody      = fullText ?? item.fullDescription ?? item.description;
  const body         = lang === 'pt' ? (ptBody ?? rawBody) : rawBody;
  const sourceColor  = SOURCE_COLORS[item.source] ?? '#78716C';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.15s ease' }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-elevated overflow-hidden"
        style={{ animation: 'slideUp 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Thumbnail */}
        {displayImage && (
          <div className="w-full aspect-[21/9] bg-surface-secondary shrink-0 overflow-hidden">
            <img src={displayImage} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors z-10 shadow-soft"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Source + time + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ color: sourceColor, backgroundColor: sourceColor + '18' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sourceColor }} />
                {item.source}
              </span>
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Clock size={11} />
                <span>{timeAgo(item.pubDate, lang)}</span>
              </div>
              {(loadingFull || xlating) && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-ink-muted/60 italic">
                  <Loader2 size={9} className="animate-spin" />
                  {loadingFull
                    ? (lang === 'pt' ? 'carregando artigo…' : 'loading article…')
                    : (lang === 'pt' ? 'traduzindo…'        : '')}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className={`text-xl font-bold text-ink-primary leading-snug tracking-tight transition-opacity ${xlating ? 'opacity-60' : ''}`}>
              {title}
            </h2>

            {/* Body */}
            {loadingFull ? (
              <div className="space-y-2 animate-pulse">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-5/6 rounded" />
                <div className="skeleton h-3 w-full rounded mt-4" />
                <div className="skeleton h-3 w-4/5 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-3/4 rounded" />
              </div>
            ) : body ? (
              <p className={`text-sm text-ink-secondary leading-relaxed whitespace-pre-line transition-opacity ${xlating ? 'opacity-60' : ''}`}>
                {body}
              </p>
            ) : (
              <p className="text-sm text-ink-muted italic">
                {lang === 'pt' ? 'Sem conteúdo disponível.' : 'No content available.'}
              </p>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-edge-subtle shrink-0 bg-white">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors shadow-soft"
            style={{ backgroundColor: sourceColor }}
          >
            {lang === 'pt' ? 'Ler artigo completo' : 'Read Full Article'}
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }                              to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
      `}</style>
    </div>
  );
}
