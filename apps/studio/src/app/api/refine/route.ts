export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const section = body?.section as string;
  const prompt = body?.prompt as string;
  if (!section || !prompt) return new Response(JSON.stringify({ error: 'Missing section or prompt' }), { status: 400 });
  const gen = process.env.GEN_INTERNAL_URL || 'http://gen:3000';
  const res = await fetch(`${gen}/refine/${encodeURIComponent(section)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}


