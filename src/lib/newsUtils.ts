/** Single source of truth for news-related UI constants and formatters.
 *  Import from here — never redefine SOURCE_COLORS or timeAgo in components. */

export const SOURCE_COLORS: Record<string, string> = {
  'Nintendo Life':    '#E4003B',
  'My Nintendo News': '#E60012',
  'Gematsu':          '#2563EB',
  'Vooks':            '#7C3AED',
  'GoNintendo':       '#16A34A',
  'Siliconera':       '#EA580C',
  'Nintendo Insider': '#0070CC',
  'Nintendo Blast':   '#CC0000',
  'Universo Nintendo':'#C41E3A',
  'Coelho News':      '#E86027',
  'CanalDigplay':     '#6B3FA0',
};

export function timeAgo(dateStr: string, lang: 'pt' | 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return lang === 'pt' ? 'agora' : 'now';
  if (m < 60) return `${m}min ${lang === 'pt' ? 'atrás' : 'ago'}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${lang === 'pt' ? 'atrás' : 'ago'}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ${lang === 'pt' ? 'atrás' : 'ago'}`;
  return `${Math.floor(d / 30)}mo ${lang === 'pt' ? 'atrás' : 'ago'}`;
}
