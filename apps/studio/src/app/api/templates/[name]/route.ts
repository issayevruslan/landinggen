import { NextRequest, NextResponse } from 'next/server';

export async function GET(_: NextRequest, { params }: { params: { name: string } }) {
  const api = process.env.API_INTERNAL_URL || 'http://api:3000';
  try {
    const r = await fetch(`${api}/api/templates/${encodeURIComponent(params.name)}`, { cache: 'no-store' });
    if (!r.ok) {
      const body = await r.text();
      return NextResponse.json({ error: `API error ${r.status}`, body }, { status: 502 });
    }
    const spec = await r.json();
    return NextResponse.json(spec);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  const api = process.env.API_INTERNAL_URL || 'http://api:3000';
  let body: any = {};
  try { body = await req.json(); } catch {}
  try {
    const r = await fetch(`${api}/api/templates/${encodeURIComponent(params.name)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const txt = await r.text();
    if (!r.ok) return NextResponse.json({ error: `API error ${r.status}`, body: txt }, { status: 502 });
    return new NextResponse(txt, { headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}


