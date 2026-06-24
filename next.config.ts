import type { NextConfig } from "next";

import "./src/lib/env/server";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  async rewrites() {
    return [
      {
        source: "/api/knowledge-base",
        destination: "/api/dashboard/knowledge-base",
      },
      {
        source: "/api/knowledge-base/:path*",
        destination: "/api/dashboard/knowledge-base/:path*",
      },
    ];
  },
};

export default nextConfig;
