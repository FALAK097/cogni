import type { CSSProperties } from "react";

/** Single brand color used across the app UI, widget defaults, and database seeds. */
export const WIDGET_BRAND_COLOR = "#7c3aed" as const;

export const BRAND_COLOR = WIDGET_BRAND_COLOR;

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return [124, 58, 237];
  }
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

export function getWidgetAccentVars(accentColor: string = WIDGET_BRAND_COLOR): CSSProperties {
  const [r, g, b] = parseHex(accentColor);
  return {
    "--widget-accent": accentColor,
    "--widget-accent-muted": `rgba(${r}, ${g}, ${b}, 0.12)`,
    "--widget-accent-border": `rgba(${r}, ${g}, ${b}, 0.35)`,
    "--widget-accent-hover": `color-mix(in srgb, ${accentColor} 88%, black)`,
  } as CSSProperties;
}
