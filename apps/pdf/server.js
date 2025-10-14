import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";

const app = express();
const PORT = 3000;
const ROOT = process.env.FILE_STORAGE_ROOT || "/data";
app.use(express.json({ limit: "5mb" }));

app.post("/rationale", async (req, res) => {
  const { spec, insights } = req.body || {};
  const outDir = path.join(ROOT, "private/pdf");
  await fsp.mkdir(outDir, { recursive: true });
  const filename = `rationale-${Date.now()}.pdf`;
  const full = path.join(outDir, filename);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(full);
  doc.pipe(stream);

  doc.fontSize(18).text("AI-Generated Design Rationale", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text("This document explains how inputs and historic data informed section choices.");
  doc.moveDown();

  doc.fontSize(14).text("Meta & SEO");
  doc.fontSize(11).text(JSON.stringify(spec?.meta || {}, null, 2));
  doc.moveDown();

  doc.fontSize(14).text("Sections");
  (spec?.sections || []).forEach((s, i) => {
    doc.fontSize(12).text(`${i + 1}. ${s.type}`);
    doc.fontSize(10).text(JSON.stringify(s.data || {}, null, 2));
    doc.moveDown();
  });

  doc.fontSize(14).text("Insights Used");
  doc.fontSize(10).text(JSON.stringify(insights || {}, null, 2));

  doc.end();
  stream.on("finish", () => {
    res.json({ key: `private/pdf/${filename}` });
  });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`PDF service listening on :${PORT}`));


