import { useParams, Link } from 'react-router-dom';
import {
  Heart, ArrowLeft, ExternalLink, Star, Users, Monitor, Package,
  Gamepad2, Globe, HardDrive, Tag, Calendar, Sparkles, Loader2,
  Newspaper, MessageSquare, TrendingUp, Play, Image as ImageIcon,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useGameDetail } from '../hooks/useGameDetail';
import { useFavorites } from '../hooks/useFavorites';
import { useGameEnrichment } from '../hooks/useGameEnrichment';
import { useLang } from '../contexts/LangContext';
import { t } from '../lib/i18n';
import { PriceChart } from '../components/games/PriceChart';
import { translateText } from '../lib/translate';

function formatAUD(n: number) { return `A$${n.toFixed(2)}`; }

function saleEndsLabel(iso: string, lang: 'pt' | 'en'): string {
  const d = new Date(iso);
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diffDays <= 0)  return t('ends_today', lang);
  if (diffDays === 1) return t('ends_tomorrow', lang);
  if (diffDays <= 14) return `${t('ends_in_days', lang)} ${diffDays} ${t('days', lang)}`;
  return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-AU', { day: 'numeric', month: 'long' });
}

function timeAgo(ts: number, lang: 'pt' | 'en'): string {
  const diff = Date.now() - ts * 1000;
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return lang === 'pt' ? 'agora' : 'now';
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

function formatReleaseDate(iso: string | undefined, lang: 'pt' | 'en'): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(
      lang === 'pt' ? 'pt-BR' : 'en-AU',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
  } catch { return iso; }
}

/** OpenCritic tier → colors */
function ocTierStyle(tier: string | null): { bg: string; text: string; label: string } {
  switch (tier?.toLowerCase()) {
    case 'mighty': return { bg: 'bg-amber-400',   text: 'text-amber-900', label: t('opencritic_tier_mighty', 'en') };
    case 'strong': return { bg: 'bg-emerald-500', text: 'text-white',     label: t('opencritic_tier_strong', 'en') };
    case 'fair':   return { bg: 'bg-yellow-400',  text: 'text-yellow-900',label: t('opencritic_tier_fair',   'en') };
    case 'weak':   return { bg: 'bg-red-400',     text: 'text-white',     label: t('opencritic_tier_weak',   'en') };
    default:       return { bg: 'bg-surface-secondary', text: 'text-ink-muted', label: tier ?? '' };
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | boolean | null }) {
  if (!value && value !== false) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-edge-subtle last:border-0">
      <div className="w-7 h-7 rounded-lg bg-surface-secondary flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-ink-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-ink-muted font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-sm text-ink-primary mt-0.5 leading-relaxed">{typeof value === 'boolean' ? '✓' : value}</p>
      </div>
    </div>
  );
}

/* ── Screenshot gallery ──────────────────────────────── */
function ScreenshotGallery({ urls, title }: { urls: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const prev = () => setActive(i => Math.max(0, i - 1));
  const next = () => setActive(i => Math.min(urls.length - 1, i + 1));

  // Keyboard nav in lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      setLightbox(null);
      if (e.key === 'ArrowRight')  setLightbox(i => Math.min(urls.length - 1, (i ?? 0) + 1));
      if (e.key === 'ArrowLeft')   setLightbox(i => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [lightbox, urls.length]);

  if (urls.length === 0) return null;

  return (
    <div className="rounded-2xl bg-surface-secondary border border-edge-subtle p-5">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon size={14} className="text-ink-muted" />
        <h3 className="text-sm font-semibold text-ink-primary">{t('game_detail_screenshots', 'en')}</h3>
        <span className="text-xs text-ink-muted ml-auto">{active + 1}/{urls.length}</span>
      </div>

      {/* Main image */}
      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-surface-card mb-3 group cursor-zoom-in"
        onClick={() => setLightbox(active)}>
        <img
          src={urls[active]}
          alt={`${title} screenshot ${active + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {urls.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); prev(); }}
              disabled={active === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 hover:bg-black/60">
              <ChevronLeft size={16} />
            </button>
            <button onClick={e => { e.stopPropagation(); next(); }}
              disabled={active === urls.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 hover:bg-black/60">
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div ref={trackRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {urls.map((url, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`shrink-0 w-20 aspect-video rounded-lg overflow-hidden transition-all duration-150 ${
                i === active ? 'ring-2 ring-ember-500 opacity-100' : 'opacity-50 hover:opacity-80'
              }`}>
              <img src={url} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={urls[lightbox]}
            alt={`${title} screenshot ${lightbox + 1}`}
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          {lightbox > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(l => (l ?? 1) - 1); }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
              <ChevronLeft size={20} />
            </button>
          )}
          {lightbox < urls.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(l => (l ?? 0) + 1); }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
              <ChevronRight size={20} />
            </button>
          )}
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-xs">ESC</button>
        </div>
      )}
    </div>
  );
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const { game, loading, error, history } = useGameDetail(id ?? '');
  const { isFav, toggle } = useFavorites();
  const { news, reddit, opencritic, loading: enrichLoading } = useGameEnrichment(game?.title ?? '');

  // PT description translation
  const [ptDesc,    setPtDesc]    = useState<string | null>(null);
  const [xlatingDesc, setXlating] = useState(false);
  useEffect(() => {
    if (!game?.description || lang !== 'pt') return;
    if (ptDesc !== null) return;
    let cancelled = false;
    setXlating(true);
    translateText(game.description).then(r => {
      if (!cancelled) { setPtDesc(r); setXlating(false); }
    });
    return () => { cancelled = true; };
  }, [lang, game?.description, ptDesc]);

  // Reset translation when game changes
  useEffect(() => { setPtDesc(null); }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
        <Link to="/games" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary mb-6 transition-colors">
          <ArrowLeft size={14} /> {t('game_detail_back', lang)}
        </Link>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-ink-muted" />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
        <Link to="/games" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary mb-6 transition-colors">
          <ArrowLeft size={14} /> {t('game_detail_back', lang)}
        </Link>
        <div className="rounded-2xl bg-ember-50 border border-ember-200 p-6 text-sm text-ember-700">
          {error ?? 'Game not found.'}
        </div>
      </div>
    );
  }

  const onSale    = (game.price.discount ?? 0) > 0;
  const noPrice   = game.price.original === 0;
  const isSwitch2 = game.platform === 'Switch 2';
  const fav       = isFav(game.id);

  const playersLabel = game.playersMin != null && game.playersMax != null
    ? game.playersMin === game.playersMax ? `${game.playersMin}` : `${game.playersMin}–${game.playersMax}`
    : game.playersMin ? `${game.playersMin}+` : null;

  const platformLabel = [
    game.hasDigital  && t('game_detail_digital', lang),
    game.hasPhysical && t('game_detail_physical', lang),
  ].filter(Boolean).join(' & ') || game.platform;

  // Date display (PT locale if lang is pt)
  const releaseDateDisplay = game.releaseDateIso
    ? formatReleaseDate(game.releaseDateIso, lang)
    : game.releaseDate ?? '';

  // Description (PT if translated)
  const descriptionDisplay = lang === 'pt' ? (ptDesc ?? game.description) : game.description;

  // YouTube trailer URL
  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(game.title + ' Nintendo Switch trailer')}`;

  // OpenCritic tier style
  const ocStyle = ocTierStyle(opencritic?.tier ?? null);
  const ocTierLabel = lang === 'pt'
    ? { mighty: t('opencritic_tier_mighty', 'pt'), strong: t('opencritic_tier_strong', 'pt'), fair: t('opencritic_tier_fair', 'pt'), weak: t('opencritic_tier_weak', 'pt') }[opencritic?.tier?.toLowerCase() ?? ''] ?? opencritic?.tier
    : opencritic?.tier;

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8 pb-16">
      {/* Back */}
      <Link to="/games"
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary mb-6 transition-colors group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        {t('game_detail_back', lang)}
      </Link>

      {/* Hero Image */}
      {game.coverImage && (
        <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden bg-surface-secondary mb-8 shadow-elevated">
          <img src={game.coverImage} alt={game.title}
            className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
            {onSale && (
              <span className="bg-ember-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-soft">
                -{game.price.discount}% OFF
              </span>
            )}
            <span className={`text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm ${
              isSwitch2 ? 'bg-violet-500/80' : 'bg-black/40'
            }`}>
              {game.platform}
            </span>
          </div>

          {/* Trailer button */}
          <a
            href={trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-14 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/70 transition-colors shadow-soft"
            onClick={e => e.stopPropagation()}
          >
            <Play size={11} fill="currentColor" />
            {t('game_detail_trailer', lang)}
          </a>

          <button
            onClick={() => toggle(game.id, game)}
            className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center
              backdrop-blur-sm shadow-soft transition-all duration-200 active:scale-90
              ${fav ? 'bg-ember-500 text-white' : 'bg-white/80 text-ink-muted hover:text-ember-500 hover:bg-white'}`}>
            <Heart size={16} fill={fav ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — main content */}
        <div className="lg:col-span-7 space-y-6">
          {/* Title + publisher */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[11px] text-ink-muted font-medium">{game.publisher}</span>
              {game.developer && game.developer !== game.publisher && (
                <>
                  <span className="text-edge-medium text-xs">·</span>
                  <span className="text-[11px] text-ink-muted">{game.developer}</span>
                </>
              )}
              {releaseDateDisplay && (
                <>
                  <span className="text-edge-medium text-xs">·</span>
                  <span className="text-[11px] text-ink-muted">{releaseDateDisplay}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-bold text-ink-primary tracking-tight leading-tight mb-3">
              {game.title}
            </h1>
            {game.categories && game.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.categories.map(cat => (
                  <span key={cat} className="bg-surface-secondary text-ink-muted text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                    {cat}
                  </span>
                ))}
                {game.series && (
                  <span className="bg-ember-50 text-ember-600 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize">
                    {game.series} series
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Current Price */}
          <div className="rounded-2xl bg-surface-card border border-edge-subtle p-5">
            <p className="text-xs text-ink-muted font-semibold uppercase tracking-wide mb-3">
              {t('game_detail_price', lang)}
            </p>
            {noPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-ink-muted italic">{t('game_detail_not_priced', lang)}</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className={`text-4xl font-bold tracking-tight ${onSale ? 'text-ember-500' : 'text-ink-primary'}`}>
                    {formatAUD(game.price.current)}
                  </span>
                  {onSale && (
                    <span className="text-xl text-ink-muted line-through font-medium">
                      {formatAUD(game.price.original)}
                    </span>
                  )}
                </div>
                {onSale && game.price.saleEnds && (
                  <p className="text-sm text-ember-500 font-medium mt-1.5">
                    ⏳ {saleEndsLabel(game.price.saleEnds, lang)}
                  </p>
                )}
                {!onSale && history.length > 0 && Math.min(...history.map(p => p.price)) < game.price.current && (
                  <p className="text-sm text-jade-500 font-medium mt-1.5">
                    {t('historical_low', lang)}: {formatAUD(Math.min(...history.map(p => p.price)))}
                  </p>
                )}
                {game.eshopUrl && (
                  <a href={game.eshopUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-ember-500 hover:text-ember-600 font-semibold transition-colors">
                    {t('game_detail_eshop', lang)}
                    <ExternalLink size={11} />
                  </a>
                )}
              </>
            )}
          </div>

          {/* Price Chart */}
          {!noPrice && (
            <PriceChart
              history={history}
              regularPrice={game.price.original}
              currentPrice={game.price.current}
              onSale={onSale}
            />
          )}

          {/* Description */}
          {game.description && (
            <div className="rounded-2xl bg-surface-secondary border border-edge-subtle p-5">
              <h3 className="text-sm font-semibold text-ink-primary mb-3 flex items-center gap-2">
                {t('game_detail_description', lang)}
                {xlatingDesc && <Loader2 size={12} className="animate-spin text-ink-muted" />}
              </h3>
              <p className={`text-sm text-ink-secondary leading-relaxed whitespace-pre-line transition-opacity ${xlatingDesc ? 'opacity-60' : ''}`}>
                {descriptionDisplay}
              </p>
            </div>
          )}

          {/* Screenshots gallery */}
          {game.screenshotUrls && game.screenshotUrls.length > 0 && (
            <ScreenshotGallery urls={game.screenshotUrls} title={game.title} />
          )}

          {/* DLC notice */}
          {game.hasDlc && (
            <div className="flex items-center gap-3 rounded-2xl bg-ember-50 border border-ember-200 p-4">
              <Sparkles size={18} className="text-ember-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ember-700">{t('game_detail_dlc', lang)}</p>
                {game.eshopUrl && (
                  <a href={game.eshopUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-ember-500 hover:underline">{t('game_detail_eshop', lang)} →</a>
                )}
              </div>
            </div>
          )}

          {/* Demo notice */}
          {game.hasDemo && (
            <div className="flex items-center gap-3 rounded-2xl bg-jade-500/10 border border-jade-500/20 p-4">
              <Gamepad2 size={18} className="text-jade-500 shrink-0" />
              <p className="text-sm font-semibold text-jade-600">{t('game_detail_demo', lang)}</p>
            </div>
          )}

          {/* Related News */}
          {(news.length > 0 || enrichLoading) && (
            <div className="rounded-2xl bg-surface-secondary border border-edge-subtle p-5">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper size={14} className="text-ink-muted" />
                <h3 className="text-sm font-semibold text-ink-primary">
                  {lang === 'pt' ? 'Notícias Relacionadas' : 'Related News'}
                </h3>
                {enrichLoading && <Loader2 size={12} className="animate-spin text-ink-muted ml-auto" />}
              </div>
              {enrichLoading && news.length === 0 ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-edge-subtle rounded w-3/4" />
                        <div className="h-3 bg-edge-subtle rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {news.map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 group hover:bg-surface-card rounded-xl p-2 -mx-2 transition-colors">
                      <ExternalLink size={12} className="shrink-0 mt-1 text-ink-muted group-hover:text-ember-500 transition-colors" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-primary font-medium leading-snug line-clamp-2 group-hover:text-ember-600 transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.source && (
                            <span className="text-[10px] text-ink-muted font-medium">{item.source}</span>
                          )}
                          {item.pubDate && (
                            <span className="text-[10px] text-ink-muted/60">
                              · {new Date(item.pubDate).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reddit Discussions */}
          {(reddit.length > 0 || enrichLoading) && (
            <div className="rounded-2xl bg-surface-secondary border border-edge-subtle p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={14} className="text-ink-muted" />
                <h3 className="text-sm font-semibold text-ink-primary">
                  {lang === 'pt' ? 'Discussões no Reddit' : 'Reddit Discussions'}
                </h3>
                {enrichLoading && <Loader2 size={12} className="animate-spin text-ink-muted ml-auto" />}
              </div>
              {enrichLoading && reddit.length === 0 ? (
                <div className="space-y-3">
                  {[1,2].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-edge-subtle rounded w-4/5" />
                        <div className="h-3 bg-edge-subtle rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {reddit.map((post, i) => (
                    <a key={i} href={post.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 group hover:bg-surface-card rounded-xl p-2 -mx-2 transition-colors">
                      <div className="shrink-0 mt-1 w-7 h-7 rounded-lg bg-[#FF4500]/10 flex items-center justify-center">
                        <TrendingUp size={12} className="text-[#FF4500]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-primary font-medium leading-snug line-clamp-2 group-hover:text-ember-600 transition-colors">
                          {post.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-ink-muted font-medium">r/{post.subreddit}</span>
                          <span className="text-[10px] text-ink-muted/60">·</span>
                          <span className="text-[10px] text-ink-muted">↑ {post.score.toLocaleString()}</span>
                          <span className="text-[10px] text-ink-muted/60">·</span>
                          <span className="text-[10px] text-ink-muted">{post.numComments} {lang === 'pt' ? 'comentários' : 'comments'}</span>
                          <span className="text-[10px] text-ink-muted/60">·</span>
                          <span className="text-[10px] text-ink-muted">{timeAgo(post.createdUtc, lang)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — game info + OpenCritic */}
        <div className="lg:col-span-5 space-y-4">
          {/* OpenCritic score */}
          {opencritic && opencritic.score !== null && (
            <div className="rounded-2xl bg-surface-card border border-edge-subtle p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={13} className="text-ink-muted" />
                <h3 className="text-sm font-semibold text-ink-primary">{t('opencritic_score', lang)}</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${ocStyle.bg}`}>
                  <span className={`text-2xl font-black ${ocStyle.text}`}>{opencritic.score}</span>
                </div>
                <div>
                  {ocTierLabel && (
                    <p className="text-base font-bold text-ink-primary">{ocTierLabel}</p>
                  )}
                  {opencritic.percentRecommended !== null && (
                    <p className="text-xs text-ink-muted mt-0.5">
                      {opencritic.percentRecommended}% {lang === 'pt' ? 'dos críticos recomendam' : 'of critics recommend'}
                    </p>
                  )}
                  <a
                    href={opencritic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-ember-500 hover:underline font-medium"
                  >
                    OpenCritic <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="rounded-2xl bg-surface-card border border-edge-subtle p-5 lg:sticky lg:top-6">
            <h3 className="text-sm font-semibold text-ink-primary mb-1">
              {t('game_detail_info', lang)}
            </h3>
            <div className="mt-2">
              <InfoRow icon={Package}    label={t('game_detail_publisher', lang)}  value={game.publisher} />
              <InfoRow icon={Star}       label={t('game_detail_developer', lang)}   value={game.developer} />
              <InfoRow icon={Calendar}   label={t('game_detail_released', lang)}    value={releaseDateDisplay} />
              <InfoRow icon={Tag}        label={t('game_detail_rating', lang)}      value={game.ageRating} />
              <InfoRow icon={Users}      label={t('game_detail_players', lang)}     value={playersLabel} />
              <InfoRow icon={Monitor}    label={t('game_detail_platforms', lang)}   value={platformLabel} />
              <InfoRow icon={HardDrive}  label={t('game_detail_size', lang)}        value={game.fileSize} />
              <InfoRow icon={Globe}      label={t('game_detail_languages', lang)}   value={game.languages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
