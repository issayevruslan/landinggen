import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const app = express();
const PORT = 3000;
const ROOT = process.env.FILE_STORAGE_ROOT || "/data";

app.use(express.json({ limit: "10mb" }));
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true
}));

app.get("/health", (_req, res) => res.json({ ok: true }));

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const visibility = (req.query.visibility || "private").toString();
      const base = visibility === "public" ? "public/uploads" : "private/uploads";
      const dest = path.join(ROOT, base);
      await fsp.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (e) {
      cb(e, ROOT);
    }
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}-${safe}`);
  }
});
const upload = multer({ storage });

app.post("/api/files/upload", upload.single("file"), (req, res) => {
  const visibility = (req.query.visibility || "private").toString();
  const relDir = visibility === "public" ? "public/uploads" : "private/uploads";
  const relPath = `${relDir}/${path.basename(req.file.path)}`;
  res.json({ key: relPath });
});

app.get("/api/files/private", async (req, res) => {
  const key = String(req.query.key || "");
  const full = path.normalize(path.join(ROOT, key));
  const privateRoot = path.join(ROOT, "private");
  if (!full.startsWith(privateRoot)) return res.status(403).end();
  if (!fs.existsSync(full)) return res.status(404).end();
  res.sendFile(full);
});

// Minimal pages endpoint placeholder
app.post("/api/pages", async (req, res) => {
  // store the spec to /data/private/exports for now
  const outDir = path.join(ROOT, "private/exports");
  await fsp.mkdir(outDir, { recursive: true });
  const filename = `page-${Date.now()}.json`;
  const full = path.join(outDir, filename);
  await fsp.writeFile(full, JSON.stringify(req.body, null, 2));
  res.json({ stored: true, key: `private/exports/${filename}` });
});

// Publish a spec under a slug for LP runtime
app.post("/api/pages/publish", async (req, res) => {
  try {
    const slug = String(req.body?.slug || "").trim().toLowerCase();
    const spec = req.body?.spec;
    if (!slug || !spec) return res.status(400).json({ error: "Missing slug or spec" });
    if (!/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ error: "Invalid slug" });
    const dir = path.join(ROOT, "private/exports/slugs");
    await fsp.mkdir(dir, { recursive: true });
    const full = path.join(dir, `${slug}.json`);
    // persist slug inside spec.meta for downstream tracking and SEO tags
    const specWithSlug = { ...spec, meta: { ...(spec.meta || {}), slug } };
    await fsp.writeFile(full, JSON.stringify({ spec: specWithSlug }, null, 2));
    res.json({ ok: true, slug });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Retrieve a published spec by slug
app.get("/api/pages/slug/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!slug) return res.status(400).end();
    const full = path.join(ROOT, "private/exports/slugs", `${slug}.json`);
    if (!fs.existsSync(full)) return res.status(404).end();
    const data = await fsp.readFile(full, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// List published slugs (for sitemap)
app.get("/api/pages/slugs", async (_req, res) => {
  try {
    const dir = path.join(ROOT, "private/exports/slugs");
    await fsp.mkdir(dir, { recursive: true });
    const files = await fsp.readdir(dir);
    const slugs = files.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
    res.json({ slugs });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Forms: accept JSON submissions and store + optional webhook
app.post("/api/forms/submit", async (req, res) => {
  try {
    const payload = req.body || {};
    const leadsDir = path.join(ROOT, "private/exports/leads");
    await fsp.mkdir(leadsDir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
    await fsp.writeFile(path.join(leadsDir, filename), JSON.stringify(payload, null, 2));
    const webhook = process.env.FORMS_WEBHOOK_URL || "";
    if (webhook) {
      try { await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); } catch {}
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- Data ingestion (historic campaigns / experiments) ----------
app.post("/api/data/upload", upload.single("file"), async (req, res) => {
  try {
    const type = String(req.query.type || "misc"); // campaigns | experiments | misc
    const dataDir = path.join(ROOT, "private/exports/data", type);
    await fsp.mkdir(dataDir, { recursive: true });
    const dest = path.join(dataDir, path.basename(req.file.path));
    await fsp.rename(req.file.path, dest);
    res.json({ ok: true, key: dest.replace(ROOT + "/", "") });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/data/list", async (_req, res) => {
  try {
    const base = path.join(ROOT, "private/exports/data");
    await fsp.mkdir(base, { recursive: true });
    const types = (await fsp.readdir(base, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name);
    const out = {};
    for (const t of types) {
      const dir = path.join(base, t);
      const files = await fsp.readdir(dir);
      out[t] = files;
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- Templates (save/load input specs) ----------
app.post("/api/templates/save", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const input = req.body?.input;
    if (!name || !input) return res.status(400).json({ error: "Missing name or input" });
    const dir = path.join(ROOT, "private/exports/templates");
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, `${name}.json`), JSON.stringify({ input }, null, 2));
    res.json({ ok: true, name });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/templates", async (_req, res) => {
  try {
    const dir = path.join(ROOT, "private/exports/templates");
    await fsp.mkdir(dir, { recursive: true });
    const names = (await fsp.readdir(dir)).filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
    res.json({ templates: names });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/templates/:name", async (req, res) => {
  try {
    const name = String(req.params.name || "").trim();
    if (!name) return res.status(400).end();
    const file = path.join(ROOT, "private/exports/templates", `${name}.json`);
    if (!fs.existsSync(file)) return res.status(404).end();
    res.setHeader("Content-Type", "application/json");
    res.send(await fsp.readFile(file, "utf8"));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});


