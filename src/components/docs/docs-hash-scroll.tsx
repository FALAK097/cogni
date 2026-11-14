"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function DocsHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    function scrollToHash() {
      const id = decodeURIComponent(window.location.hash.slice(1));
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
