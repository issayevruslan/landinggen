// @ts-nocheck
import { NextResponse, NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const candidates = [
    (url.host || "").toLowerCase(),
    (req.headers.get("host") || "").toLowerCase(),
    (req.headers.get("x-forwarded-host") || "").toLowerCase(),
    (req.headers.get("x-forwarded-server") || "").toLowerCase()
  ].filter(Boolean);
  const originHost = (process.env.ORIGIN_HOST || "lp.cso.ae").toLowerCase();
  const requestHost = candidates.find(h => h === originHost || h.endsWith("." + originHost)) || candidates[0] || "";

  if (requestHost !== originHost && requestHost.endsWith("." + originHost)) {
    const slug = requestHost.slice(0, -("." + originHost).length);
    if (slug && slug !== "www") {
      if (!url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api") && url.pathname === "/") {
        url.pathname = `/p/${slug}`;
        return NextResponse.rewrite(url);
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};


