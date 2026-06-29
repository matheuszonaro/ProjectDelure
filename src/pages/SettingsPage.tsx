import { useState, useRef } from 'react';
import { Settings, Globe, Rss, Plus, Trash2, Pencil, Check, X, RotateCcw, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useLang } from '../contexts/LangContext';
import { t } from '../lib/i18n';
import type { NewsSource } from '../types';

/* ── small helpers ─────────────────────────────────────── */

function isValidUrl(s: string) {
  try { new URL(s); return true; } catch { return false; }
}

/* ── inline edit form ───────────────────────────────────── */

function SourceEditRow({
  source,
  onSave,
  onCancel,
}: {
  source: Partial<NewsSource>;
  onSave: (name: string, url: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(source.name ?? '');
  const [url,  setUrl]  = useState(source.url  ?? '');
  const urlValid = isValidUrl(url);

  return (
    <div className="flex flex-col gap-2 p-3 bg-surface-secondary rounded-xl border border-edge-subtle">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name (e.g. Nintendo Life)"
        className="px-3 py-2 bg-surface-card border border-edge-subtle rounded-lg text-sm text-ink-primary
                   placeholder:text-ink-muted focus:outline-none focus:border-ember-300 focus:ring-2 focus:ring-ember-500/15"
      />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://example.com/feed/"
        className={`px-3 py-2 bg-surface-card border rounded-lg text-sm text-ink-primary
                    placeholder:text-ink-muted focus:outline-none focus:ring-2 transition-colors
                    ${url && !urlValid
                      ? 'border-ember-300 focus:ring-ember-500/15 focus:border-ember-400'
                      : 'border-edge-subtle focus:border-ember-300 focus:ring-ember-500/15'}`}
      />
      {url && !urlValid && (
        <p className="text-[11px] text-ember-500 -mt-1 px-1">Enter a valid URL starting with https://</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-secondary hover:bg-surface-card transition-colors">
          <X size={12} className="inline mr-1" />Cancel
        </button>
        <button
          disabled={!name.trim() || !urlValid}
          onClick={() => onSave(name.trim(), url.trim())}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-ember-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ember-600 transition-colors">
          <Check size={12} className="inline mr-1" />Save
        </button>
      </div>
    </div>
  );
}

/* ── source row ─────────────────────────────────────────── */

function SourceRow({
  source,
  onToggle,
  onEdit,
  onDelete,
}: {
  source: NewsSource;
  onToggle: () => void;
  onEdit: (name: string, url: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <SourceEditRow
        source={source}
        onSave={(name, url) => { onEdit(name, url); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150
      ${source.enabled
        ? 'bg-surface-card border-edge-subtle'
        : 'bg-surface-secondary border-transparent opacity-50'}`}>
      {/* Toggle */}
      <button onClick={onToggle} className="shrink-0 text-ink-muted hover:text-ember-500 transition-colors">
        {source.enabled
          ? <ToggleRight size={22} className="text-ember-500" />
          : <ToggleLeft  size={22} />}
      </button>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-primary truncate">{source.name}</p>
        <p className="text-[11px] text-ink-muted truncate">{source.url}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-secondary transition-colors"
          title="Open feed">
          <ExternalLink size={13} />
        </a>
        <button
          onClick={() => setEditing(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-secondary transition-colors"
          title="Edit">
          <Pencil size={13} />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-ember-500 text-white hover:bg-ember-600 transition-colors">
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-ink-secondary hover:bg-surface-secondary transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ember-500 hover:bg-ember-50 transition-colors"
            title="Delete">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────── */

export default function SettingsPage() {
  const { lang }  = useLang();
  const {
    lang: settingsLang, sources,
    setDefaultLang, addSource,
    removeSource, toggleSource, editSource, resetSources,
  } = useSettings();

  const [showAdd,    setShowAdd]    = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = () => {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleSetLang = (l: 'pt' | 'en') => {
    setDefaultLang(l);
    flash();
  };

  return (
    <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-secondary border border-edge-subtle flex items-center justify-center">
            <Settings size={16} className="text-ink-muted" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink-primary tracking-tight">{t('settings_title', lang)}</h1>
          </div>
        </div>
        {savedFlash && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-jade-500 animate-fade-in">
            <Check size={13} /> {t('settings_saved', lang)}
          </span>
        )}
      </div>

      {/* ── Language ─────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} className="text-ink-muted" />
          <h2 className="text-sm font-semibold text-ink-primary">{t('settings_language', lang)}</h2>
        </div>
        <div className="rounded-2xl bg-surface-card border border-edge-subtle p-5">
          <p className="text-xs text-ink-secondary mb-4">{t('settings_language_desc', lang)}</p>
          <div className="flex gap-3">
            {(['pt', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => handleSetLang(l)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-150
                  ${settingsLang === l
                    ? 'border-ember-500 bg-ember-50 text-ember-600 shadow-soft'
                    : 'border-edge-subtle bg-surface-secondary text-ink-secondary hover:border-edge-medium hover:text-ink-primary'
                  }`}>
                {l === 'pt' ? '🇧🇷  Português' : '🇦🇺  English'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── News Sources ─────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Rss size={14} className="text-ink-muted" />
          <h2 className="text-sm font-semibold text-ink-primary">{t('settings_sources', lang)}</h2>
        </div>

        <div className="rounded-2xl bg-surface-card border border-edge-subtle p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-ink-secondary">{t('settings_sources_desc', lang)}</p>
            <button
              onClick={resetSources}
              className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink-secondary transition-colors"
              title="Reset to defaults">
              <RotateCcw size={11} />
              Reset
            </button>
          </div>

          {/* Source list */}
          <div className="space-y-2 mb-4">
            {sources.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-6">No sources. Add one below.</p>
            ) : (
              sources.map(src => (
                <SourceRow
                  key={src.id}
                  source={src}
                  onToggle={() => { toggleSource(src.id); flash(); }}
                  onEdit={(name, url) => { editSource(src.id, name, url); flash(); }}
                  onDelete={() => { removeSource(src.id); flash(); }}
                />
              ))
            )}
          </div>

          {/* Add new */}
          {showAdd ? (
            <SourceEditRow
              source={{}}
              onSave={(name, url) => { addSource(name, url); setShowAdd(false); flash(); }}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         border-2 border-dashed border-edge-medium text-xs font-semibold text-ink-secondary
                         hover:border-ember-300 hover:text-ember-500 hover:bg-ember-50 transition-all duration-150">
              <Plus size={13} />
              {t('settings_add_source', lang)}
            </button>
          )}
        </div>

        {/* Active count */}
        <p className="text-[11px] text-ink-muted mt-3 text-center">
          {sources.filter(s => s.enabled).length} / {sources.length}{' '}
          {lang === 'pt' ? 'fontes ativas' : 'sources active'}
        </p>
      </section>
    </div>
  );
}
