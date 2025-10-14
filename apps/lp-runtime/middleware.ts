// @ts-nocheck
import { NextResponse, NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Determine candidate host values in priority order and pick the first
  // that actually includes the origin host suffix.
  const candidates = [
    (url.host || "").toLowerCase(),
    (req.headers.get("host") || "").toLowerCase(),
    (req.headers.get("x-forwarded-host") || "").toLowerCase(),
    (req.headers.get("x-forwarded-server") || "").toLowerCase()
  ].filter(Boolean);
  const originHost = (process.env.ORIGIN_HOST || "lp.cso.ae").toLowerCase();
  const requestHost = candidates.find(h => h === originHost || h.endsWith("." + originHost)) || candidates[0] || "";

  // Only rewrite on wildcard subdomains of ORIGIN_HOST, and only for root path
  if (requestHost !== originHost && requestHost.endsWith("." + originHost)) {
    const slug = requestHost.slice(0, -("." + originHost).length);
    // Ignore system subdomains (www)
    if (slug && slug !== "www") {
      // Avoid rewriting Next internals
      if (!url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api") && url.pathname === "/") {
        url.pathname = `/p/${slug}`;
        const res = NextResponse.rewrite(url);
        res.headers.set("x-lp-rewrite-slug", slug);
        res.headers.set("x-lp-request-host", requestHost);
        return res;
      }
    }
  }
  const pass = NextResponse.next();
  pass.headers.set("x-lp-request-host", requestHost);
  pass.headers.set("x-lp-origin-host", originHost);
  return pass;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};


