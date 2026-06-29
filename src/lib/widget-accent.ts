import type { CSSProperties } from "react";

export const WIDGET_BRAND_COLOR = "#14805e";

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return [20, 128, 94];
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
