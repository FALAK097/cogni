export const SITE_NAME = "widget";

export function getVisitorName(visitorId: string) {
  if (!visitorId) return "Visitor";
  return `Visitor ${visitorId.slice(0, 6)}`;
}
