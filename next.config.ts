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
  serverExternalPackages: [
    "better-sqlite3",
    "chat",
    "chat-state-cloudflare-do",
    "@chat-adapter/discord",
    "@chat-adapter/gchat",
    "@chat-adapter/slack",
    "@chat-adapter/teams",
    "@chat-adapter/whatsapp",
    "discord.js",
    "@discordjs/ws",
  ],
};

export default nextConfig;
