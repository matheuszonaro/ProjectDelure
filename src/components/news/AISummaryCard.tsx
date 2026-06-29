import { Sparkles, X, ExternalLink, Clock, ChevronRight, Newspaper } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAISummary } from '../../hooks/useAISummary';
import { useLang } from '../../contexts/LangContext';
import type { SummaryArticle } from '../../hooks/useAISummary';

/* ─── AI Summary Modal ─────────────────────────────────────── */

interface ModalProps {
  summary: { en: string; pt: string };
  articles: SummaryArticle[];
  generatedAt: string | null;
  onClose: () => void;
}

function timeAgo(iso: string, lang: 'pt' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return lang === 'pt' ? 'agora' : 'now';
  if (m < 60) return `${m}min ${lang === 'pt' ? 'atrás' : 'ago'}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${lang === 'pt' ? 'atrás' : 'ago'}`;
  return `${Math.floor(h / 24)}d ${lang === 'pt' ? 'atrás' : 'ago'}`;
}

function AISummaryModal({ summary, articles, generatedAt, onClose }: ModalProps) {
  const { lang } = useLang();
  const text = lang === 'pt' ? summary.pt : summary.en;

  // Close on Escape + lock scroll
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      style={{ animation: 'fadeIn .15s ease' }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-elevated overflow-hidden"
        style={{ animation: 'slideUp .2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient header strip */}
        <div className="shrink-0 h-2 bg-gradient-to-r from-ember-400 via-purple-400 to-sky-400" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-edge-subtle transition-colors z-10"
        >
          <X size={14} />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Title */}
            <div className="flex items-center gap-2.5 pr-8">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ember-400 to-purple-500 flex items-center justify-center shrink-0">
                <Sparkles size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink-primary leading-tight">
                  {lang === 'pt' ? 'Resumo das Últimas 24h' : 'Nintendo News Digest'}
                </h2>
                {generatedAt && (
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    {lang === 'pt' ? 'Gerado' : 'Generated'} · {timeAgo(generatedAt, lang)}
                  </p>
                )}
              </div>
            </div>

            {/* AI badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-ember-50 to-purple-50 border border-ember-200/60 text-[10px] font-semibold text-ember-600">
              <Sparkles size={9} />
              {lang === 'pt' ? 'Resumo gerado por Inteligência Artificial' : 'AI-generated summary · Powered by Pollinations'}
            </div>

            {/* Summary body */}
            <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-line">
              {text}
            </p>

            {/* Related articles */}
            {articles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper size={13} className="text-ink-muted" />
                  <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    {lang === 'pt' ? 'Notícias das últimas 24h' : 'Last 24h articles'} ({articles.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {articles.map((a, i) => (
                    <a
                      key={i}
                      href={a.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-2.5 p-2.5 rounded-xl border border-edge-subtle hover:bg-surface-secondary transition-colors group"
                    >
                      {a.thumbnail && (
                        <div className="w-14 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-secondary">
                          <img
                            src={a.thumbnail}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-ink-muted mb-0.5">{a.source}</p>
                        <p className="text-xs font-medium text-ink-primary leading-snug line-clamp-2 group-hover:text-ember-600 transition-colors">
                          {a.title}
                        </p>
                      </div>
                      <ExternalLink size={10} className="shrink-0 mt-1 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="shrink-0 px-6 py-3 border-t border-edge-subtle bg-surface-secondary/50">
          <p className="text-[10px] text-ink-muted text-center">
            {lang === 'pt'
              ? '✨ Resumo automático gerado por IA · Acesse as notícias originais para mais detalhes'
              : '✨ Automatically generated AI summary · Visit original articles for full details'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(24px);opacity:0 } to { transform:none;opacity:1 } }
      `}</style>
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────── */
function AISummaryCardSkeleton() {
  return (
    <div className="p-[2px] rounded-2xl bg-gradient-to-br from-ember-300 via-purple-300 to-sky-300 animate-pulse">
      <div className="rounded-[14px] bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl skeleton" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-4/5 rounded" />
        <div className="skeleton h-3 w-3/5 rounded" />
      </div>
    </div>
  );
}

/* ─── Main card ────────────────────────────────────────────── */
export function AISummaryCard() {
  const { lang }  = useLang();
  const { summary, articles, loading, generatedAt } = useAISummary();
  const [open, setOpen] = useState(false);

  if (loading) return <AISummaryCardSkeleton />;
  if (!summary) return null;

  const preview = (lang === 'pt' ? summary.pt : summary.en)
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 180);

  return (
    <>
      {/* Gradient-border card */}
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left p-[2px] rounded-2xl bg-gradient-to-br from-ember-400 via-purple-400 to-sky-400
                   hover:shadow-[0_0_0_1px_rgba(224,122,69,0.3),0_8px_24px_rgba(124,58,237,0.15)]
                   transition-shadow duration-300 group animate-fade-in"
      >
        <div className="rounded-[14px] bg-white p-5 h-full">
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Icon + title */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ember-400 to-purple-500 flex items-center justify-center shrink-0 shadow-soft">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink-primary leading-none">
                  {lang === 'pt' ? 'Resumo das Últimas 24h' : 'Nintendo News Digest'}
                </h3>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  {lang === 'pt' ? 'Gerado por IA' : 'AI-generated'} ·{' '}
                  {articles.length} {lang === 'pt' ? 'notícias' : 'articles'}
                </p>
              </div>
            </div>

            {/* AI badge */}
            <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full
                             bg-gradient-to-r from-ember-100 to-purple-100 text-purple-600 border border-purple-200/60">
              <Sparkles size={7} />
              IA
            </span>
          </div>

          {/* Preview text */}
          <p className="text-xs text-ink-secondary leading-relaxed line-clamp-3 mb-3">
            {preview}…
          </p>

          {/* Footer row */}
          <div className="flex items-center justify-between">
            {generatedAt && (
              <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                <Clock size={9} />
                <span>{timeAgo(generatedAt, lang)}</span>
              </div>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600
                             group-hover:gap-1.5 transition-all duration-150">
              {lang === 'pt' ? 'Ver resumo completo' : 'Read full digest'}
              <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </button>

      {/* Modal */}
      {open && (
        <AISummaryModal
          summary={summary}
          articles={articles}
          generatedAt={generatedAt}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
