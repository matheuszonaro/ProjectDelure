import { useState, useEffect } from 'react';
import { fetchEnrichment } from '../lib/api';
import type { EnrichmentNews, EnrichmentReddit, EnrichmentOpenCritic } from '../lib/api';

export function useGameEnrichment(title: string) {
  const [news,        setNews]       = useState<EnrichmentNews[]>([]);
  const [reddit,      setReddit]     = useState<EnrichmentReddit[]>([]);
  const [opencritic,  setOpencritic] = useState<EnrichmentOpenCritic | null>(null);
  const [loading,     setLoading]    = useState(false);

  useEffect(() => {
    if (!title.trim()) return;
    let cancelled = false;
    setLoading(true);

    fetchEnrichment(title).then(data => {
      if (!cancelled) {
        setNews(data.news);
        setReddit(data.reddit);
        setOpencritic(data.opencritic);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [title]);

  return { news, reddit, opencritic, loading };
}
