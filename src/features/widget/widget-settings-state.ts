export type WidgetSettingsLoadState = "loading" | "error" | "ready" | "stale-error";

export function getWidgetSettingsLoadState({
  hasData,
  isError,
}: {
  hasData: boolean;
  isError: boolean;
}): WidgetSettingsLoadState {
  if (hasData) return isError ? "stale-error" : "ready";
  if (isError) return "error";
  return "loading";
}
