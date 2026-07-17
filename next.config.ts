import type { NextConfig } from "next";

import "./src/lib/env/server";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
  reactCompiler: true,
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

export default nextConfig;
