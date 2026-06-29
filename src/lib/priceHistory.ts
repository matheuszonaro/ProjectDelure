import type { PricePoint } from '../types';

const POINTS_KEY = 'delure:price-points';
const LOW_KEY    = 'delure:price-history';

type PointsStore = Record<string, PricePoint[]>;

function loadPoints(): PointsStore {
  try { return JSON.parse(localStorage.getItem(POINTS_KEY) ?? '{}') as PointsStore; }
  catch { return {}; }
}
function loadLows(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LOW_KEY) ?? '{}') as Record<string, number>; }
  catch { return {}; }
}

/**
 * Record a price observation.
 * When `original` is supplied and the game is on sale with no prior history,
 * we seed a synthetic "before sale" point so the chart immediately shows the drop.
 */
export function recordPrice(
  id: string, current: number, onSale: boolean, original?: number,
): void {
  if (current <= 0) return;
  try {
    // Update historical low
    const lows = loadLows();
    if (!(id in lows) || current < lows[id]) {
      lows[id] = current;
      localStorage.setItem(LOW_KEY, JSON.stringify(lows));
    }

    const points  = loadPoints();
    const existing = points[id] ?? [];
    const today   = new Date().toISOString().split('T')[0];
    const last    = existing[existing.length - 1];

    // Seed a "before sale" point the first time we see a discounted game
    if (existing.length === 0 && onSale && original && original > current) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      existing.push({
        date: yesterday.toISOString().split('T')[0],
        price: original,
        onSale: false,
      });
    }

    // Add a new point if price or sale status changed, or it's a new day
    const priceChanged   = !last || last.price !== current;
    const saleChanged    = !last || last.onSale !== onSale;
    const dayChanged     = !last || last.date !== today;

    if (priceChanged || saleChanged || dayChanged) {
      existing.push({ date: today, price: current, onSale });
      points[id] = existing.slice(-120);
      localStorage.setItem(POINTS_KEY, JSON.stringify(points));
    }
  } catch { /* ignore */ }
}

export function getHistoricalLow(id: string): number | undefined {
  return loadLows()[id];
}

export function getPriceHistory(id: string): PricePoint[] {
  return loadPoints()[id] ?? [];
}
