import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = process.env.ORIGIN_HOST || 'lp.cso.ae';
  const base = `https://${host}`;
  const api = process.env.API_INTERNAL_URL || 'http://api:3000';
  try {
    const { slugs } = await fetch(`${api}/api/pages/slugs`, { cache: 'no-store' }).then(r => r.json());
    return (slugs || []).map((s: string) => ({ url: `${base}/p/${s}`, changefreq: 'weekly', priority: 0.7 }));
  } catch {
    return [];
  }
}


