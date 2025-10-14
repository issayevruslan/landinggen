import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new Response("Missing key", { status: 400 });

  const apiBase = process.env.API_INTERNAL_URL || "http://api:3000";
  const upstream = await fetch(`${apiBase}/api/files/private?key=${encodeURIComponent(key)}`);
  if (!upstream.ok) {
    return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
  }
  const buf = await upstream.arrayBuffer();
  const ct = upstream.headers.get("content-type") || "application/pdf";
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": ct,
      "cache-control": "no-store"
    }
  });
}


