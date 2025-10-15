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
    <main>
      <p className="kv">Paste or edit the input JSON, upload datasets, then generate a spec + rationale PDF.</p>
      <div className="card" style={{ marginBottom: 12 }}>
        <DataUpload />
      </div>
      <div className="grid-two">
        <section className="card">
          <h3>Input</h3>
          <textarea value={input} onChange={e => setInput(e.target.value)} style={{ height: 520, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={onGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </button>
            {result?.spec && (
              <>
                <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="campaign-slug" style={{ width: 240 }} />
                <button className="secondary" onClick={onPublish}>Publish</button>
                {publishRes?.ok && (
                  <div className="kv" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Published →</span>
                    <a className="button secondary" target="_blank" href={liveUrl!}>Live URL</a>
                    <a className="button secondary" target="_blank" href={liveWildcard!}>Wildcard</a>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        <section className="card">
          <h3>Result</h3>
          <pre style={{ background: '#0f1017', border: '1px solid var(--border)', borderRadius: 8, padding: 12, height: 480, overflow: 'auto' }}>{result ? JSON.stringify(result, null, 2) : ""}</pre>
          {result?.spec && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <a className="button secondary"
                target="_blank"
                href={`/preview?spec=${encodeURIComponent(
                  typeof window === 'undefined'
                    ? ''
                    : window.btoa(unescape(encodeURIComponent(JSON.stringify(result.spec))))
                )}`}
              >
                Preview
              </a>
              {result?.pdf?.key && <a className="button secondary" target="_blank" href={`/api/pdf?key=${encodeURIComponent(result.pdf.key)}`}>Rationale PDF</a>}
              <RefineSectionUI onRefine={async (section, prompt) => {
                const res = await fetch('/api/refine', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ section, prompt }) });
                const data = await res.json();
                if (data?.result) {
                  try {
                    const spec = { ...(result.spec || {}) };
                    const idx = (spec.sections || []).findIndex((s: any) => s.type === section);
                    if (idx >= 0) spec.sections[idx] = { ...(spec.sections[idx] || {}), data: { ...(spec.sections[idx]?.data || {}), refined: data.result } };
                    setResult({ ...result, spec });
                  } catch {}
                }
              }} />
              <TemplateControls currentInput={input} onLoadTemplate={async (name) => {
                const t = await fetch(`/api/templates/${encodeURIComponent(name)}`).then(r => r.json());
                if (t?.input) setInput(JSON.stringify(t.input, null, 2));
              }} onSaveTemplate={async (name) => {
                await fetch('/api/templates/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, input: JSON.parse(input) }) });
              }} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function RefineSectionUI({ onRefine }: { onRefine: (section: string, prompt: string) => Promise<void> }) {
  const [section, setSection] = useState('hero');
  const [prompt, setPrompt] = useState('Make the hero headline emphasize DIFC setup benefits for CFOs.');
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select value={section} onChange={e => setSection(e.target.value)}>
        <option value="hero">hero</option>
        <option value="features">features</option>
        <option value="benefits">benefits</option>
        <option value="testimonials">testimonials</option>
        <option value="cta">cta</option>
        <option value="form">form</option>
      </select>
      <input value={prompt} onChange={e => setPrompt(e.target.value)} style={{ width: 360 }} />
      <button onClick={() => onRefine(section, prompt)}>Refine</button>
    </div>
  );
}

function TemplateControls({ currentInput, onLoadTemplate, onSaveTemplate }: { currentInput: string; onLoadTemplate: (name: string) => Promise<void>; onSaveTemplate: (name: string) => Promise<void>; }) {
  const [templates, setTemplates] = useState<string[]>([]);
  const [name, setName] = useState('my-template');
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={async () => { const t = await fetch('/api/templates').then(r => r.json()); setTemplates(t?.templates || []); }}>List Templates</button>
      <select onChange={e => onLoadTemplate(e.target.value)}>
        <option value="">Load…</option>
        {templates.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="template-name" />
      <button onClick={() => onSaveTemplate(name)}>Save as Template</button>
    </div>
  );
}

function DataUpload() {
  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const type = (form.querySelector('select[name=type]') as HTMLSelectElement).value;
    await fetch(`/api/data/upload?type=${encodeURIComponent(type)}`, { method: 'POST', body: fd });
    alert('Uploaded');
  }
  return (
    <form onSubmit={onUpload} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
      <label>Type
        <select name="type" defaultValue="campaigns">
          <option value="campaigns">Campaigns</option>
          <option value="experiments">Experiments</option>
          <option value="misc">Misc</option>
        </select>
      </label>
      <input type="file" name="file" required />
      <button type="submit">Upload Dataset</button>
    </form>
  );
}


