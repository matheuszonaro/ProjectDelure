import { NavLink } from 'react-router-dom';
import { Newspaper, Gamepad2, Heart, Settings } from 'lucide-react';
import { useLang } from '../../contexts/LangContext';
import { t } from '../../lib/i18n';
import { DelureLogo } from './Logo';

export default function Sidebar({ favCount }: { favCount: number }) {
  const { lang } = useLang();

  const NAV = [
    { to: '/',          icon: Newspaper, key: 'nav_news'      as const },
    { to: '/games',     icon: Gamepad2,  key: 'nav_games'     as const },
    { to: '/favorites', icon: Heart,     key: 'nav_favorites' as const },
  ];

  return (
    <aside className="w-56 h-screen bg-surface-secondary border-r border-edge-subtle flex flex-col sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <div className="flex items-center gap-2.5">
          <DelureLogo size={32} />
          <span className="text-[18px] font-bold tracking-[-0.5px] text-ink-primary">Delure</span>
        </div>
        <p className="text-[11px] text-ink-muted mt-1.5 font-medium tracking-wide uppercase">
          {t('nav_subtitle', lang)}
        </p>
      </div>

      <div className="h-px bg-edge-subtle mx-5 mb-3" />

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-0.5">
        {NAV.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{t(key, lang)}</span>
                {key === 'nav_favorites' && favCount > 0 && (
                  <span className="ml-auto bg-ember-100 text-ember-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    {favCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer — date + settings button */}
      <div className="px-5 pb-5">
        <div className="h-px bg-edge-subtle mb-3" />
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted font-medium leading-snug">
              {new Date().toLocaleDateString(
                lang === 'pt' ? 'pt-BR' : 'en-AU',
                { day: 'numeric', month: 'long', year: 'numeric' },
              )}
            </p>
            <p className="text-[10px] text-ink-muted/70 mt-0.5">{t('prices_in_aud', lang)}</p>
          </div>

          {/* Settings gear — small, unobtrusive */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150
               ${isActive
                 ? 'bg-ember-100 text-ember-600'
                 : 'text-ink-muted/50 hover:text-ink-secondary hover:bg-surface-primary'}`
            }
            title={t('nav_settings', lang)}
          >
            <Settings size={14} strokeWidth={1.8} />
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
