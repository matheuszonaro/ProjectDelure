import { useState, useEffect } from 'react';
import type { GameDetail } from '../types';
import { fetchGameDetail } from '../lib/api';
import { getPriceHistory } from '../lib/priceHistory';
import type { PricePoint } from '../types';

export function useGameDetail(fsId: string) {
  const [game,    setGame]    = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);

  useEffect(() => {
    if (!fsId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGame(null);

    fetchGameDetail(fsId).then(result => {
      if (cancelled) return;
      if (!result) {
        setError('Jogo não encontrado.');
      } else {
        setGame(result);
        setHistory(getPriceHistory(fsId));
      }
    }).catch(() => {
      if (!cancelled) setError('Não foi possível carregar os detalhes do jogo.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [fsId]);

  return { game, loading, error, history };
}
