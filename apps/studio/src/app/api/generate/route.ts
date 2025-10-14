import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const text = await req.text();
  const input = JSON.parse(text || "{}");

  const genUrl = process.env.GEN_INTERNAL_URL || "http://gen:3000";
  const pdfUrl = process.env.PDF_INTERNAL_URL || "http://pdf:3000";

  const genRes = await fetch(`${genUrl}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  const gen = await genRes.json();

  const pdfRes = await fetch(`${pdfUrl}/rationale`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spec: gen.spec, insights: { kpis: input.primaryConversionKpi, audience: input.targetAudienceDescription } })
  });
  const pdf = await pdfRes.json();

  return new Response(JSON.stringify({ ...gen, pdf }), { headers: { "content-type": "application/json" } });
}


