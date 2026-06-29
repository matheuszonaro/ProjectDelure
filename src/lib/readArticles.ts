/** Persists which article URLs the user has already opened.
 *  Stored in localStorage; capped at MAX entries to avoid bloat. */

const KEY = 'delure:read';
const MAX  = 500;

function loadSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]); }
  catch { return new Set(); }
}

export function getReadLinks(): Set<string> { return loadSet(); }

export function markRead(link: string): void {
  try {
    const set = loadSet();
    if (set.has(link)) return;
    set.add(link);
    const arr = [...set];
    localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
  } catch { /* ignore quota errors */ }
}
