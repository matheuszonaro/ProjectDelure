import { useState, useEffect, useCallback } from 'react';
import type { NewsSource } from '../types';
import { getSettings, saveSettings, saveNewsSources, SETTINGS_EV, DEFAULT_SOURCES } from '../lib/settings';

export function useSettings() {
  const [lang,    setLangState]    = useState<'pt' | 'en'>(() => getSettings().lang);
  const [sources, setSourcesState] = useState<NewsSource[]>(() => getSettings().newsSources);

  // Sync across components
  useEffect(() => {
    const sync = () => {
      const s = getSettings();
      setLangState(s.lang);
      setSourcesState(s.newsSources);
    };
    window.addEventListener(SETTINGS_EV, sync);
    return () => window.removeEventListener(SETTINGS_EV, sync);
  }, []);

  const setDefaultLang = useCallback((l: 'pt' | 'en') => {
    saveSettings({ lang: l });
  }, []);

  const updateSources = useCallback((sources: NewsSource[]) => {
    saveNewsSources(sources);
  }, []);

  const addSource = useCallback((name: string, url: string) => {
    const s = getSettings();
    const next = [...s.newsSources, {
      id: `custom-${Date.now()}`, name, url, enabled: true,
    }];
    saveNewsSources(next);
  }, []);

  const removeSource = useCallback((id: string) => {
    const s = getSettings();
    saveNewsSources(s.newsSources.filter(src => src.id !== id));
  }, []);

  const toggleSource = useCallback((id: string) => {
    const s = getSettings();
    saveNewsSources(s.newsSources.map(src => src.id === id ? { ...src, enabled: !src.enabled } : src));
  }, []);

  const editSource = useCallback((id: string, name: string, url: string) => {
    const s = getSettings();
    saveNewsSources(s.newsSources.map(src => src.id === id ? { ...src, name, url } : src));
  }, []);

  const resetSources = useCallback(() => {
    saveNewsSources(DEFAULT_SOURCES);
  }, []);

  return { lang, sources, setDefaultLang, updateSources, addSource, removeSource, toggleSource, editSource, resetSources };
}
