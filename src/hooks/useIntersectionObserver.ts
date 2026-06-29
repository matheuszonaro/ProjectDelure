import { useRef, useEffect, useCallback } from 'react';

export function useIntersectionObserver(
  onIntersect: () => void,
  enabled = true,
) {
  const ref = useRef<HTMLDivElement>(null);
  const cb  = useRef(onIntersect);
  cb.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) cb.current(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
