import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requestIdHeaderName } from "@/lib/tracing/constants";

export function proxy(request: NextRequest) {
  const headerName = requestIdHeaderName();
  const requestId = request.headers.get(headerName) ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(headerName, requestId);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(headerName, requestId);
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/conversations/:path*",
    "/widget/:path*",
    "/integrations/:path*",
    "/knowledge-base/:path*",
  ],
};
