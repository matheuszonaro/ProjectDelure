import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Game } from '../../types';
import { useLang } from '../../contexts/LangContext';
import { t } from '../../lib/i18n';
import { getHistoricalLow } from '../../lib/priceHistory';

function formatAUD(n: number) { return `A$${n.toFixed(2)}`; }

function saleEndsLabel(iso: string, lang: 'pt' | 'en'): string {
  const d = new Date(iso);
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diffDays <= 0)  return t('ends_today', lang);
  if (diffDays === 1) return t('ends_tomorrow', lang);
  if (diffDays <= 14) return `${t('ends_in_days', lang)} ${diffDays} ${t('days', lang)}`;
  return `${d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-AU', { day: 'numeric', month: 'short' })}`;
}

interface Props {
  game: Game;
  isFav: boolean;
  onToggleFav: (id: string, game: Game) => void;
}

export function GameCard({ game, isFav, onToggleFav }: Props) {
  const { lang }  = useLang();
  const onSale    = (game.price.discount ?? 0) > 0;
  const histLow   = getHistoricalLow(game.id);
  const isHistLow = histLow !== undefined && onSale && game.price.current <= histLow;
  const isSwitch2 = game.platform === 'Switch 2';
  const noPrice   = game.price.original === 0;

  return (
    <Link to={`/games/${game.id}`} className="block group">
      <div className="card h-full animate-slide-up">
        {/* Cover */}
        <div className="relative aspect-[16/9] bg-surface-secondary overflow-hidden">
          {game.coverImage ? (
            <img src={game.coverImage} alt={game.title}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface-secondary to-edge-subtle flex items-center justify-center">
              <span className="text-3xl opacity-20">🎮</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
            {onSale && (
              <span className="bg-ember-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-soft">
                -{game.price.discount}%
              </span>
            )}
            {isHistLow && (
              <span className="bg-jade-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-soft">
                ↓ {t('historical_low', lang)}
              </span>
            )}
          </div>

          {/* Favorite */}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFav(game.id, game); }}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center
              backdrop-blur-sm shadow-soft transition-all duration-200 active:scale-90
              ${isFav ? 'bg-ember-500 text-white' : 'bg-white/80 text-ink-muted hover:text-ember-500 hover:bg-white'}`}>
            <Heart size={13} fill={isFav ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] text-ink-muted font-medium truncate">{game.publisher}</span>
            <span className="text-edge-medium">·</span>
            <span className={`tag text-[10px] px-1.5 py-0 shrink-0 ${
              isSwitch2
                ? 'bg-violet-100 text-violet-600'
                : 'bg-surface-secondary text-ink-muted'
            }`}>
              {isSwitch2 ? 'Switch 2' : t('platform_switch', lang)}
            </span>
          </div>

          <h3 className="text-[13px] font-semibold text-ink-primary leading-snug line-clamp-2 mb-3">
            {game.title}
          </h3>

          {/* Release date (coming-soon) */}
          {noPrice && (game.releaseDate || game.releaseDateIso) && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-ink-muted font-semibold uppercase tracking-wide">
                {t('coming_soon_release', lang)}
              </span>
              <span className="text-xs font-semibold text-ink-primary">
                {game.releaseDateIso
                  ? new Date(game.releaseDateIso).toLocaleDateString(
                      lang === 'pt' ? 'pt-BR' : 'en-AU',
                      { day: 'numeric', month: 'short', year: 'numeric' }
                    )
                  : (game.releaseDate ?? t('coming_soon_no_date', lang))}
              </span>
            </div>
          )}

          {/* Price */}
          {noPrice ? (
            <p className="text-sm font-semibold text-ink-muted italic">{t('price_tba', lang)}</p>
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-base font-bold ${onSale ? 'text-ember-500' : 'text-ink-primary'}`}>
                {formatAUD(game.price.current)}
              </span>
              {onSale && (
                <span className="text-xs text-ink-muted line-through">{formatAUD(game.price.original)}</span>
              )}
            </div>
          )}

          {/* Historical low */}
          {!noPrice && histLow !== undefined && !isHistLow && (
            <p className="text-[10px] text-ink-muted mt-1">
              {t('historical_low', lang)}: {formatAUD(histLow)}
            </p>
          )}

          {onSale && game.price.saleEnds && (
            <p className="text-[11px] text-ink-muted mt-1">{saleEndsLabel(game.price.saleEnds, lang)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="card animate-pulse overflow-hidden">
      <div className="aspect-[16/9] skeleton" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-5 w-20 rounded mt-1" />
      </div>
    </div>
  );
}
