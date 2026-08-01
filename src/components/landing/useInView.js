'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns a ref and whether the element is in the viewport.
 * Respects prefers-reduced-motion (always visible when reduced motion is on).
 */
export function useInView(options = {}) {
  const { threshold = 0.15, rootMargin = '0px 0px -8% 0px' } = options;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}
