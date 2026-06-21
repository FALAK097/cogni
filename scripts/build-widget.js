#!/usr/bin/env node
/**
 * Build script for bundling widget modules into a single distributable file
 *
 * Usage: node scripts/build-widget.js
 * Output: public/widget.bundle.js (for production use by clients)
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = path.join(__dirname, "..");
const inputFile = path.join(rootDir, "public/widget.js");
const outputFile = path.join(rootDir, "public/widget.bundle.js");
const esbuildBinary = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "esbuild.cmd" : "esbuild",
);

console.log("🔨 Building widget bundle...");

try {
  const buildCommand = fs.existsSync(esbuildBinary)
    ? `"${esbuildBinary}" ${inputFile} --bundle --format=iife --outfile=${outputFile} --minify --sourcemap`
    : `pnpm exec esbuild ${inputFile} --bundle --format=iife --outfile=${outputFile} --minify --sourcemap`;
  execSync(buildCommand, {
    cwd: rootDir,
    stdio: "inherit",
  });

  // Get file size
  const stats = fs.statSync(outputFile);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log(`✅ Widget bundle created: public/widget.bundle.js (${fileSizeKB} KB)`);
  console.log("\n📋 Client usage:");
  console.log(
    '   <script src="https://your-domain.com/widget.bundle.js" data-widget-key="PUBLIC_KEY" async></script>',
  );
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
