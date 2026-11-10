const RETURN_PATH_ORIGIN = "https://cogni.invalid";

export function safeReturnPath(value: string | null | undefined, fallback = "/insights") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, RETURN_PATH_ORIGIN);
    if (url.origin !== RETURN_PATH_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
