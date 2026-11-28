/** Returns true inside Cloudflare Workers (`workerd`), where module-global timers cannot outlive a request. */
export function isWorkersRuntime(): boolean {
  return (
    typeof globalThis.navigator?.userAgent === "string" &&
    globalThis.navigator.userAgent === "Cloudflare-Workers"
  );
}
