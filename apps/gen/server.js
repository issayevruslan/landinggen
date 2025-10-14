import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "5mb" }));

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
    const apiBase = process.env.API_BASE_URL || "http://api:3000";
    const store = await fetch(`${apiBase}/api/pages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ spec, input })
    }).then(r => r.json());
    res.json({ spec, storage: store });
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


