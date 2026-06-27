import type { NextConfig } from "next";

import "./src/lib/env/server";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudflare/image-loader.ts",
  },
  reactCompiler: true,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
