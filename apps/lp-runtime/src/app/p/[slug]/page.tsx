import { Renderer } from "../../../components/Renderer";
import { AnalyticsScripts } from "../../../components/Analytics";
import type { Metadata } from "next";

async function fetchSpec(slug: string) {
  const api = process.env.API_INTERNAL_URL || "http://api:3000";
  const res = await fetch(`${api}/api/pages/slug/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.spec || null;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const spec = await fetchSpec(params.slug);
  if (!spec) return <main style={{ padding: 24 }}>Not found.</main>;
  return (
    <main>
      <AnalyticsScripts analytics={spec?.analytics || { gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID, gtmContainerId: process.env.NEXT_PUBLIC_GTM_ID }} />
      <Renderer spec={spec} />
    </main>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const spec = await fetchSpec(params.slug);
  const title = spec?.meta?.title || params.slug;
  const description = spec?.meta?.description || "";
  const url = `https://${process.env.ORIGIN_HOST || 'lp.cso.ae'}/p/${params.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' }
  };
}


