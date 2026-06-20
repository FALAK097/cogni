import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const bundlePath = path.join(process.cwd(), "public", "widget.bundle.js");

  try {
    const source = await readFile(bundlePath, "utf8");
    return new Response(source, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("console.error('[widget] Bundle missing. Run pnpm build:widget');", {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
      status: 404,
    });
  }
}
