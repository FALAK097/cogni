"use client";

import { useEffect } from "react";

export function ForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement;

    const applyLight = () => {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    };

    applyLight();

    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark")) {
        applyLight();
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
