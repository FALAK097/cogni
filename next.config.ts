import type { NextConfig } from "next";

import "./src/lib/env/server";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudflare/image-loader.ts",
  },
  reactCompiler: true,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
