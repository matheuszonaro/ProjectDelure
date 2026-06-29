import { Heart, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import { useLang } from '../contexts/LangContext';
import { t } from '../lib/i18n';
import { GameCard } from '../components/games/GameCard';

export default function FavoritesPage() {
  const { savedGames, isFav, toggle, count } = useFavorites();
  const { lang } = useLang();

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-primary tracking-tight flex items-center gap-2.5">
          {t('fav_title', lang)}
          {count > 0 && (
            <span className="text-sm font-semibold bg-ember-100 text-ember-600 px-2.5 py-0.5 rounded-full">{count}</span>
          )}
        </h1>
        <p className="text-sm text-ink-secondary mt-0.5">{t('fav_subtitle', lang)}</p>
      </div>

      {savedGames.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {savedGames.map(game => (
            <GameCard key={game.id} game={game} isFav={isFav(game.id)} onToggleFav={id => toggle(id)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
            <Heart size={24} className="text-ink-muted opacity-40" />
          </div>
          <p className="text-sm font-medium text-ink-secondary mb-1">{t('fav_empty', lang)}</p>
          <p className="text-xs text-ink-muted mb-6">{t('fav_cta', lang)}</p>
          <Link to="/games" className="btn-primary">
            <Gamepad2 size={14} />
            {t('browse_games', lang)}
          </Link>
        </div>
      )}
    </div>
  );
}
