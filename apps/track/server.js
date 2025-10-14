import express from "express";

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "2mb" }));

app.post("/event", (req, res) => {
  // Minimal collector stub; forward to DB later
  console.log("event", req.body);
  res.json({ ok: true });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Track listening on :${PORT}`));


