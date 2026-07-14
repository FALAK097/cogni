export function brandLogoUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

export function parseAuthorizedDomains(raw: string | null | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (domain): domain is string => typeof domain === "string" && domain.length > 0,
    );
  } catch {
    return [];
  }
}

export function getWebsiteFaviconUrl(
  authorizedDomains: string | null | undefined,
  size = 64,
): string | null {
  const domain = parseAuthorizedDomains(authorizedDomains)[0];
  if (!domain) return null;
  return brandLogoUrl(domain, size);
}

export const BRAND_ICONS = {
  cal: brandLogoUrl("cal.com"),
  calendly: brandLogoUrl("calendly.com"),
  freshdesk: brandLogoUrl("freshdesk.com"),
  gmail: brandLogoUrl("gmail.com"),
  google: brandLogoUrl("google.com"),
  helpscout: brandLogoUrl("helpscout.com"),
  hubspot: brandLogoUrl("hubspot.com"),
  instagram: brandLogoUrl("instagram.com"),
  intercom: brandLogoUrl("intercom.com"),
  linkedin: brandLogoUrl("linkedin.com"),
  messenger: brandLogoUrl("messenger.com"),
  salesforce: brandLogoUrl("salesforce.com"),
  shopify: brandLogoUrl("shopify.com"),
  slack: brandLogoUrl("slack.com"),
  stripe: brandLogoUrl("stripe.com"),
  twilio: brandLogoUrl("twilio.com"),
  whatsapp: brandLogoUrl("whatsapp.com"),
  x: brandLogoUrl("x.com"),
  youtube: brandLogoUrl("youtube.com"),
  zendesk: brandLogoUrl("zendesk.com"),
  zoho: brandLogoUrl("zoho.com"),
} as const;
