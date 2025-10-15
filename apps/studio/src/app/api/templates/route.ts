import { NextResponse } from 'next/server';

export async function GET() {
  const api = process.env.API_INTERNAL_URL || 'http://api:3000';
  try {
    const r = await fetch(`${api}/api/templates`, { cache: 'no-store' });
    if (!r.ok) {
      const body = await r.text();
      return NextResponse.json({ error: `API error ${r.status}`, body }, { status: 502 });
    }
    const list = await r.json();
    return NextResponse.json({ templates: Array.isArray(list) ? list : [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}


