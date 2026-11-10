"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-triggered reveal hook using IntersectionObserver.
 * Returns a ref to attach to the target element and a boolean
 * indicating whether it has entered the viewport.
 *
 * Once triggered, it stays revealed (no re-hide on scroll out).
 */
export function useReveal(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? "-60px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return { ref, revealed };
}
