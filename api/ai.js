export default async function handler(req, res) {
  // CORS (важно для Telegram WebView)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const N8N_WEBHOOK = "https://broakk72.app.n8n.cloud/webhook/tg-form/ai";

  try {
    const r = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { text }; }

    if (!r.ok) {
      res.status(r.status).json({
        error: data?.error || data?.message || text || `HTTP ${r.status}`,
      });
      return;
    }

    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Proxy error" });
  }
}
