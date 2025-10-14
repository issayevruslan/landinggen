import express from "express";
import fetch from "node-fetch";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "5mb" }));

const ROOT = process.env.FILE_STORAGE_ROOT || "/data";

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(l => {
    const cols = l.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cols[i] || "").trim()));
    return row;
  });
}

async function readJsonOrCsv(full) {
  const raw = await fsp.readFile(full, "utf8");
  if (full.endsWith(".json")) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return parseCSV(raw);
}

async function loadDatasets() {
  const out = { campaigns: [], experiments: [] };
  const legacyBase = path.join(ROOT, "private/exports/data");
  const uploadBase = path.join(ROOT, "private/data");

  // Read structured folders if present
  for (const t of ["campaigns", "experiments"]) {
    const dir = path.join(legacyBase, t);
    if (fs.existsSync(dir)) {
      const files = await fsp.readdir(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        try {
          const rows = await readJsonOrCsv(full);
          if (Array.isArray(rows)) out[t].push(...rows);
        } catch {}
      }
    }
  }

  // Read any uploaded files (unknown type → treat as campaigns)
  if (fs.existsSync(uploadBase)) {
    const files = await fsp.readdir(uploadBase);
    for (const f of files) {
      const full = path.join(uploadBase, f);
      try {
        const rows = await readJsonOrCsv(full);
        if (Array.isArray(rows)) out.campaigns.push(...rows);
      } catch {}
    }
  }

  return out;
}

function num(value) {
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function computeInsights({ campaigns = [], experiments = [] }) {
  const findKey = (obj, contains) => Object.keys(obj).find(k => k.toLowerCase().includes(contains));
  const convRows = campaigns.filter(r => !!findKey(r, "conv"));
  convRows.sort((a, b) => num(b[findKey(b, "conv")]) - num(a[findKey(a, "conv")]));
  const top = convRows.slice(0, 5);
  const headlineKey = top[0] ? findKey(top[0], "headline") || findKey(top[0], "title") : undefined;
  const ctaKey = top[0] ? findKey(top[0], "cta") || findKey(top[0], "button") : undefined;
  const deviceKey = top[0] ? findKey(top[0], "device") : undefined;
  const channelKey = top[0] ? findKey(top[0], "channel") || findKey(top[0], "source") : undefined;

  const insights = {
    topHeadlines: top.map(r => (headlineKey ? r[headlineKey] : null)).filter(Boolean),
    topCtas: top.map(r => (ctaKey ? r[ctaKey] : null)).filter(Boolean),
    bestByDevice: [],
    bestByChannel: [],
  };

  if (deviceKey) {
    const byDevice = {};
    for (const r of convRows) {
      const d = r[deviceKey];
      const c = num(r[findKey(r, "conv")]);
      if (!byDevice[d] || c > byDevice[d].metric) byDevice[d] = { device: d, metric: c, row: r };
    }
    insights.bestByDevice = Object.values(byDevice);
  }
  if (channelKey) {
    const byCh = {};
    for (const r of convRows) {
      const ch = r[channelKey];
      const c = num(r[findKey(r, "conv")]);
      if (!byCh[ch] || c > byCh[ch].metric) byCh[ch] = { channel: ch, metric: c, row: r };
    }
    insights.bestByChannel = Object.values(byCh);
  }
  return insights;
}
// Generate a page spec using inputs + call API to persist
app.post("/generate", async (req, res) => {
  const input = req.body || {};
  const spec = {
    meta: {
      title: `${input.productOrServiceName || "Offer"} — ${input.campaignObjective || "Campaign"}`,
      description: input.uniqueValueProposition || "",
      seoKeywords: input.targetSeoKeywords || []
    },
    theme: {
      colors: input.brandColorPalette || [],
      fonts: input.fontStyleGuide || { heading: "Inter", body: "Inter" }
    },
    analytics: input.analytics || null,
    sections: [
      { type: "hero", data: { headline: input.uniqueValueProposition || "", sub: input.topBenefits?.[0] || "", cta: input.primaryCtaText || "Get started" } },
      { type: "features", data: { items: input.featureList || [] } },
      { type: "benefits", data: { items: input.topBenefits || [] } },
      { type: "testimonials", data: { items: input.testimonials || [] } },
      { type: "faq", data: { items: input.faq || [] } },
      { type: "cta", data: { text: input.primaryCtaText || "Get started" } }
    ],
    form: input.form || null
  };

  try {
    // Load datasets → insights
    const datasets = await loadDatasets();
    const insights = computeInsights(datasets);

    // Apply insights into spec if helpful
    const hero = spec.sections.find(s => s.type === "hero");
    if (hero && (!hero.data.headline || hero.data.headline.length < 8) && insights.topHeadlines[0]) {
      hero.data.headline = insights.topHeadlines[0];
    }
    const cta = spec.sections.find(s => s.type === "cta");
    if (cta && (!cta.data.text || cta.data.text === "Get started") && insights.topCtas[0]) {
      cta.data.text = insights.topCtas[0];
    }
    // Ensure a form section is present if form exists in input
    if (spec.form?.fields && !spec.sections.some(s => s.type === "form")) {
      spec.sections.push({ type: "form", data: { fields: spec.form.fields } });
    }

    const apiBase = process.env.API_BASE_URL || "http://api:3000";
    const store = await fetch(`${apiBase}/api/pages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ spec, input })
    }).then(r => r.json());
    res.json({ spec, insights, storage: store });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Section-only refine placeholder
app.post("/refine/:section", async (req, res) => {
  const section = req.params.section;
  const prompt = req.body?.prompt || "";
  res.json({ section, result: `Refined ${section} using prompt: ${prompt}` });
});

app.listen(PORT, () => console.log(`GEN listening on :${PORT}`));


