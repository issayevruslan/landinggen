import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let input: any = {};
  try {
    const text = await req.text();
    input = text ? JSON.parse(text) : {};
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const genUrl = process.env.GEN_INTERNAL_URL || "http://gen:3000";
  const pdfUrl = process.env.PDF_INTERNAL_URL || "http://pdf:3000";

  try {
    const genRes = await fetch(`${genUrl}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!genRes.ok) {
      const body = await genRes.text().catch(() => "<no body>");
      return NextResponse.json({ error: `GEN service error ${genRes.status}`, body }, { status: 502 });
    }
    let gen: any;
    try {
      gen = await genRes.json();
    } catch (e) {
      return NextResponse.json({ error: "GEN returned non-JSON response" }, { status: 502 });
    }

    // Call PDF, but don't hard fail the request if PDF errors — return spec + error
    let pdf: any = null;
    try {
      const pdfRes = await fetch(`${pdfUrl}/rationale`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec: gen.spec, insights: gen.insights || { kpis: input.primaryConversionKpi, audience: input.targetAudienceDescription } })
      });
      if (pdfRes.ok) {
        pdf = await pdfRes.json().catch(() => null);
      } else {
        const body = await pdfRes.text().catch(() => "<no body>");
        pdf = { error: `PDF service error ${pdfRes.status}`, body };
      }
    } catch (e: any) {
      pdf = { error: `PDF request failed: ${e?.message || e}` };
    }

    return NextResponse.json({ ...gen, pdf });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}


