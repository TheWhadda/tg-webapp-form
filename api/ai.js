export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const N8N_AI_URL = process.env.N8N_AI_URL;
  if (!N8N_AI_URL) return res.status(500).json({ ok: false, error: "Missing N8N_AI_URL env" });

  try {
    const r = await fetch(N8N_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });

    const text = await r.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(r.status).send(text);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Proxy error" });
  }
}
