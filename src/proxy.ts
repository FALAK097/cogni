import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS" && request.nextUrl.pathname.startsWith("/api/widget/")) {
    const origin = request.headers.get("origin");
    const response = new NextResponse(null, { status: 204 });

    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.headers.set(
        "Access-Control-Expose-Headers",
        "X-Widget-Session-Id, X-Widget-Session-Token",
      );
      response.headers.set("Access-Control-Max-Age", "86400");
    }

    return response;
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: "/api/widget/:path*",
};
