export async function POST(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'misc';
  // Proxy form-data upload via fetch with the same body
  const api = process.env.API_INTERNAL_URL || 'http://api:3000';
  const res = await fetch(`${api}/api/data/upload?type=${encodeURIComponent(type)}`, {
    method: 'POST',
    headers: { 'content-type': req.headers.get('content-type') || '' },
    body: req.body as any
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}


