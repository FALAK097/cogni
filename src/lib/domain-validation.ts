export const sanitizeDomain = (domain: string): string | null => {
  if (!domain) return null;

  let cleaned = domain.replace(/^https?:\/\//, "");

  cleaned = cleaned.replace(/\/$/, "");

  cleaned = cleaned.split(":")[0];

  cleaned = cleaned.replace(/^www\./, "");

  cleaned = cleaned.toLowerCase();

  return cleaned;
};

export const isValidDomain = (domain: string): boolean => {
  const sanitized = sanitizeDomain(domain);
  if (!sanitized) return false;

  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

  return domainRegex.test(sanitized);
};
