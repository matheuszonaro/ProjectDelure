import type { NewsSource } from '../types';

export const DEFAULT_SOURCES: NewsSource[] = [
  { id: 'nintendolife',     name: 'Nintendo Life',     url: 'https://www.nintendolife.com/feeds/latest',              enabled: true },
  { id: 'mynintendonews',   name: 'My Nintendo News',  url: 'https://mynintendonews.com/feed/',                       enabled: true },
  { id: 'gematsu',          name: 'Gematsu',           url: 'https://gematsu.com/category/nintendo/feed',             enabled: true },
  { id: 'vooks',            name: 'Vooks',             url: 'https://www.vooks.net/feed/',                            enabled: true },
  { id: 'gonintendo',       name: 'GoNintendo',        url: 'https://gonintendo.com/feed',                            enabled: true },
  { id: 'siliconera',       name: 'Siliconera',        url: 'https://www.siliconera.com/category/nintendo/feed/',     enabled: true },
  { id: 'nintendoinsider',  name: 'Nintendo Insider',  url: 'https://www.nintendo-insider.com/feed/',                 enabled: true },
  { id: 'nintendoblast',    name: 'Nintendo Blast',    url: 'https://www.nintendoblast.com.br/feeds/posts/default?alt=rss', enabled: true },
  // Brazilian sources — Universo Nintendo has RSS; the other two are scraped via sitemap
  { id: 'universonintendo', name: 'Universo Nintendo', url: 'https://universonintendo.com/feed/',                     enabled: true },
  { id: 'coelhonews',       name: 'Coelho News',       url: 'https://www.coelhonews.com/',                            enabled: true },
  { id: 'canaldigplay',     name: 'CanalDigplay',      url: 'https://www.canaldigplay.com/',                          enabled: true },
];

const KEY = 'delure:settings';
const EV  = 'delure:settings-changed';

interface Settings {
  lang:        'pt' | 'en';
  newsSources: NewsSource[];
}

/**
 * Merge saved sources with DEFAULT_SOURCES so that newly-added sources always
 * appear in Settings even when the user has an older list persisted in localStorage.
 * User-customised enable/disable choices are preserved for existing sources.
 */
function mergeWithDefaults(saved: NewsSource[]): NewsSource[] {
  const savedById = new Map(saved.map(s => [s.id, s]));
  // Start with all defaults, substituting the saved version when it exists
  return DEFAULT_SOURCES.map(def => savedById.get(def.id) ?? def);
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { lang: 'pt', newsSources: DEFAULT_SOURCES };
    const p = JSON.parse(raw) as Partial<Settings>;
    const sources = p.newsSources?.length
      ? mergeWithDefaults(p.newsSources)
      : DEFAULT_SOURCES;
    return { lang: p.lang ?? 'pt', newsSources: sources };
  } catch { return { lang: 'pt', newsSources: DEFAULT_SOURCES }; }
}

function persist(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent(EV));
  } catch { /* ignore */ }
}

export function getSettings():    Settings     { return load(); }
export function getNewsSources(): NewsSource[] { return load().newsSources.filter(s => s.enabled); }

export function saveSettings(patch: Partial<Settings>): void { persist({ ...load(), ...patch }); }

export function saveNewsSources(sources: NewsSource[]): void {
  persist({ ...load(), newsSources: sources });
}

export const SETTINGS_EV = EV;
