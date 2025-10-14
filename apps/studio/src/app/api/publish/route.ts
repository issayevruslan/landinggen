export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { slug, spec } = body || {};
  if (!slug || !spec) {
    return new Response(JSON.stringify({ error: "Missing slug or spec" }), { status: 400 });
  }
  const api = process.env.API_INTERNAL_URL || "http://api:3000";
  const res = await fetch(`${api}/api/pages/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, spec })
  });
  return new Response(await res.text(), { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}
