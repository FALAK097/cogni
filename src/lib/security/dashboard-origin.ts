const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DASHBOARD_API_PATH = "/api/dashboard";

export type DashboardMutationOriginError =
  | "missing-origin"
  | "invalid-origin"
  | "invalid-fetch-site";

export function getDashboardMutationOriginError(
  request: Pick<Request, "method" | "url" | "headers">,
): DashboardMutationOriginError | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const requestUrl = new URL(request.url);
  if (
    requestUrl.pathname !== DASHBOARD_API_PATH &&
    !requestUrl.pathname.startsWith(`${DASHBOARD_API_PATH}/`)
  ) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) return "missing-origin";

  try {
    const parsedOrigin = new URL(origin);
    if (origin !== parsedOrigin.origin || parsedOrigin.origin !== requestUrl.origin) {
      return "invalid-origin";
    }
  } catch {
    return "invalid-origin";
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite.toLowerCase() !== "same-origin") {
    return "invalid-fetch-site";
  }

  return null;
}
