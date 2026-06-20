import { buildWidgetLoaderSource } from "@/features/widget/loader/build-loader";

export function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;

  return new Response(buildWidgetLoaderSource(baseUrl), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
