export const validateOrigin = (origin: string, allowedDomains: string[] = []): boolean => {
  if (!origin) return false;
  if (!allowedDomains || allowedDomains.length === 0) return false;

  let originHostname: string | null = null;
  try {
    const originUrl = new URL(origin);
    originHostname = originUrl.hostname;
  } catch {
    originHostname = origin
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0];
  }

  return allowedDomains.some((domain) => {
    const cleanedDomain = domain.replace(/^https?:\/\//, "").toLowerCase();

    if (originHostname === cleanedDomain) return true;

    if (originHostname && originHostname.endsWith("." + cleanedDomain)) return true;

    return false;
  });
};

export const sanitizeDomain = (domain: string): string | null => {
  if (!domain) return null;

  let cleaned = domain.replace(/^https?:\/\//, "");

  cleaned = cleaned.replace(/\/$/, "");

  cleaned = cleaned.split(":")[0];

  cleaned = cleaned.replace(/^www\./, "");

  cleaned = cleaned.toLowerCase();

  return cleaned;
};

export const formatDomainForDisplay = (domain: string): string => {
  if (!domain) return "";
  return domain.toLowerCase();
};

export const isValidDomain = (domain: string): boolean => {
  const sanitized = sanitizeDomain(domain);
  if (!sanitized) return false;

  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

  return domainRegex.test(sanitized);
};
