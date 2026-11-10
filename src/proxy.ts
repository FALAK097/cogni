import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDashboardMutationOriginError } from "@/lib/security/dashboard-origin";

export function proxy(request: NextRequest) {
  const originError = getDashboardMutationOriginError(request);
  if (originError) {
    return NextResponse.json(
      { error: "Cross-origin dashboard requests are not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/dashboard/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
