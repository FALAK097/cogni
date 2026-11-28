type CloudflareGeoProperties = {
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
};

type CloudflareContext = {
  cf?: CloudflareGeoProperties;
};

export type RequestGeo = {
  country: string | null;
  city: string | null;
  timezone: string | null;
};

function readCloudflareContext(): CloudflareContext | undefined {
  return (globalThis as unknown as Record<symbol, CloudflareContext | undefined>)[
    Symbol.for("__cloudflare-context__")
  ];
}

/**
 * Resolves visitor geo metadata for the current request. Cloudflare's `cf`
 * object is authoritative on Workers; the headers keep local and legacy
 * deployments working.
 */
export function getRequestGeo(headers: Headers): RequestGeo {
  const cf = readCloudflareContext()?.cf;

  return {
    country:
      cf?.country ?? headers.get("cf-ipcountry") ?? headers.get("x-vercel-ip-country") ?? null,
    city: cf?.city ?? headers.get("x-vercel-ip-city") ?? null,
    timezone: cf?.timezone ?? headers.get("x-vercel-ip-timezone") ?? null,
  };
}
