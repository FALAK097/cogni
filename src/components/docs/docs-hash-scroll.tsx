"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function DocsHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    function scrollToHash() {
      const rawId = window.location.hash.slice(1);
      let id = rawId;
      try {
        id = decodeURIComponent(rawId);
      } catch {
        // Malformed fragment such as `#%`: fall back to the raw value instead of throwing.
      }
      if (!id || cancelled) return;

      window.requestAnimationFrame(() => {
        if (!cancelled) document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    }

    scrollToHash();
    const settleTimer = window.setTimeout(scrollToHash, 150);
    void document.fonts.ready.then(scrollToHash);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelled = true;
      window.clearTimeout(settleTimer);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [pathname]);

  return null;
}
