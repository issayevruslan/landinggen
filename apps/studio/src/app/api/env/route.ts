export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ga = process.env.NEXT_PUBLIC_GA_ID || "";
  const gtm = process.env.NEXT_PUBLIC_GTM_ID || "";
  return new Response(JSON.stringify({ ga, gtm }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}


