import { useState, useCallback, useEffect } from 'react';
import type { Game } from '../types';

const KEY_IDS   = 'delure:fav-ids';
const KEY_GAMES = 'delure:fav-games';
const EV        = 'delure:favs-changed';

function loadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY_IDS) ?? '[]') as string[]); }
  catch { return new Set(); }
}

function loadGames(): Record<string, Game> {
  try { return JSON.parse(localStorage.getItem(KEY_GAMES) ?? '{}') as Record<string, Game>; }
  catch { return {}; }
}

function persist(ids: Set<string>, games: Record<string, Game>) {
  try {
    localStorage.setItem(KEY_IDS,   JSON.stringify([...ids]));
    localStorage.setItem(KEY_GAMES, JSON.stringify(games));
    window.dispatchEvent(new CustomEvent(EV));
  } catch { /* ignore */ }
}

export function useFavorites() {
  const [ids,       setIds]   = useState<Set<string>>(loadIds);
  const [gameStore, setStore] = useState<Record<string, Game>>(loadGames);

  // Re-sync when any instance of this hook makes a change
  useEffect(() => {
    const sync = () => { setIds(loadIds()); setStore(loadGames()); };
    window.addEventListener(EV, sync);
    return () => window.removeEventListener(EV, sync);
  }, []);

  const toggle = useCallback((id: string, game?: Game) => {
    setIds(prevIds => {
      const nextIds = new Set(prevIds);
      setStore(prevStore => {
        const nextStore = { ...prevStore };
        if (nextIds.has(id)) { nextIds.delete(id); delete nextStore[id]; }
        else                 { nextIds.add(id); if (game) nextStore[id] = game; }
        persist(nextIds, nextStore);
        return nextStore;
      });
      const n = new Set(prevIds);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const isFav      = useCallback((id: string) => ids.has(id), [ids]);
  const savedGames = Object.values(gameStore).filter(g => ids.has(g.id));

  return { ids, toggle, isFav, count: ids.size, savedGames };
}
