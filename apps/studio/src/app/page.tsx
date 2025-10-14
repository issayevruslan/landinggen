"use client";
import { useEffect, useState } from "react";

const defaultInput = {
  campaignObjective: "lead_gen",
  primaryConversionKpi: "5% sign-ups",
  targetAudienceDescription: "Finance leaders in MENA",
  buyerPersonaKeywords: ["finance", "CFO", "MENA"],
  productOrServiceName: "DIFC Corporate Services",
  primaryOffer: "Free consultation",
  uniqueValueProposition: "Establish and scale in DIFC with confidence.",
  topBenefits: ["Fast setup", "Regulatory clarity", "Trusted advisors"],
  featureList: ["Company formation", "Compliance", "Banking support"],
  primaryCtaText: "Book a consultation",
  secondaryCtaText: "Download brochure",
  form: {
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true },
      { name: "email", label: "Work email", type: "email", required: true }
    ],
    method: "POST",
    endpoint: "/api/forms/submit",
    successRedirect: "/thank-you"
  },
  brandColorPalette: ["#0033A0", "#00A3E0", "#111111", "#FFFFFF"],
  fontStyleGuide: { heading: "Inter", body: "Inter" },
  targetSeoKeywords: ["DIFC setup", "Dubai finance"],
  analytics: { gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID || "", gtmContainerId: process.env.NEXT_PUBLIC_GTM_ID || "" }
};

export default function Studio() {
  const [input, setInput] = useState(JSON.stringify(defaultInput, null, 2));
  useEffect(() => {
    fetch('/api/env')
      .then(r => r.json())
      .then(({ ga, gtm }) => {
        try {
          const obj = JSON.parse(input);
          obj.analytics = obj.analytics || {};
          if (ga) obj.analytics.gaMeasurementId = ga;
          if (gtm) obj.analytics.gtmContainerId = gtm;
          setInput(JSON.stringify(obj, null, 2));
        } catch {}
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState("difc-corporate-services");
  const [publishRes, setPublishRes] = useState<any>(null);

  const onGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", body: input });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const onPublish = async () => {
    if (!result?.spec) return;
    setPublishRes(null);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, spec: result.spec })
    });
    const data = await res.json();
    setPublishRes(data);
  };

  const liveUrl = slug ? `https://lp.cso.ae/p/${slug}` : null;
  const liveWildcard = slug ? `https://${slug}.lp.cso.ae` : null;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1>CSO Studio</h1>
      <p>Paste or edit the input JSON, then generate a page spec + rationale PDF.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section>
          <h3>Input</h3>
          <textarea value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', height: 480, fontFamily: 'monospace', fontSize: 12 }} />
          <button onClick={onGenerate} disabled={loading} style={{ marginTop: 12 }}>
            {loading ? "Generating..." : "Generate"}
          </button>
          {result?.spec && (
            <div style={{ marginTop: 12 }}>
              <label>Slug:&nbsp;<input value={slug} onChange={e => setSlug(e.target.value)} placeholder="campaign-slug" /></label>
              <button onClick={onPublish} style={{ marginLeft: 8 }}>Publish</button>
              {publishRes?.ok && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <a target="_blank" href={liveUrl!}>Live URL</a>
                  <a target="_blank" href={liveWildcard!}>Wildcard URL</a>
                </div>
              )}
            </div>
          )}
        </section>
        <section>
          <h3>Result</h3>
          <pre style={{ background: '#f5f5f5', padding: 12, height: 440, overflow: 'auto' }}>{result ? JSON.stringify(result, null, 2) : ""}</pre>
          {result?.spec && (
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                target="_blank"
                href={`/preview?spec=${encodeURIComponent(
                  typeof window === 'undefined'
                    ? ''
                    : window.btoa(unescape(encodeURIComponent(JSON.stringify(result.spec))))
                )}`}
              >
                Preview
              </a>
              {result?.pdf?.key && <a target="_blank" href={`/api/pdf?key=${encodeURIComponent(result.pdf.key)}`}>Download Rationale PDF</a>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


