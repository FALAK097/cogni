import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

import "./src/lib/env/server";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: [
    "chat",
    "unpdf",
    "@chat-adapter/discord",
    "@chat-adapter/gchat",
    "@chat-adapter/slack",
    "@chat-adapter/teams",
    "@chat-adapter/whatsapp",
  ],
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
  reactCompiler: true,
  async redirects() {
    return [{ source: "/help", destination: "/docs", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/widget.bundle.js",
        headers: [
          { key: "Cache-Control", value: "public,max-age=300,stale-while-revalidate=3600" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default createMDX()(nextConfig);
