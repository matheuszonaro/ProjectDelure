import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lang } from '../lib/i18n';

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; }

const LangContext = createContext<LangCtx>({ lang: 'pt', setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('delure:lang') ?? 'pt') as Lang; }
    catch { return 'pt'; }
  });

  const set = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('delure:lang', l); } catch { /* ignore */ }
  };

  return <LangContext.Provider value={{ lang, setLang: set }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
