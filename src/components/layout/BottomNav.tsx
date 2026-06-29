import { NavLink } from 'react-router-dom';
import { Newspaper, Gamepad2, Heart, Settings } from 'lucide-react';
import { useLang } from '../../contexts/LangContext';
import { t } from '../../lib/i18n';

export default function BottomNav({ favCount }: { favCount: number }) {
  const { lang } = useLang();

  const NAV = [
    { to: '/',          icon: Newspaper, key: 'nav_news'      as const },
    { to: '/games',     icon: Gamepad2,  key: 'nav_games'     as const },
    { to: '/favorites', icon: Heart,     key: 'nav_favorites' as const },
    { to: '/settings',  icon: Settings,  key: 'nav_settings'  as const },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 h-16 bg-surface-overlay backdrop-blur-md border-t border-edge-subtle flex">
      {NAV.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors duration-150
             ${isActive ? 'text-ember-500' : 'text-ink-muted'}`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                {key === 'nav_favorites' && favCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-ember-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {favCount > 9 ? '9+' : favCount}
                  </span>
                )}
              </div>
              {t(key, lang)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
