import type { NextConfig } from "next";

import "./src/lib/env/server";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
};

export default nextConfig;
