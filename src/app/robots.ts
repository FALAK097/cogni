import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/contact", "/privacy-policy", "/terms", "/help"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/agent/",
          "/inbox/",
          "/analytics/",
          "/integrations/",
          "/settings/",
        ],
      },
    ],
    sitemap: "https://cogni.falakgala.dev/sitemap.xml",
  };
}
