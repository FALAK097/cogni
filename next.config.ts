import type { NextConfig } from "next";

import "./src/lib/env/server";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
