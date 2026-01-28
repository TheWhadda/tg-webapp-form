export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("OK");
    return;
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL;

  if (!BOT_TOKEN || !WEBAPP_URL) {
    res.status(500).json({ ok: false, error: "Missing BOT_TOKEN or WEBAPP_URL env" });
    return;
  }

  const update = req.body || {};
  const message = update?.message;
  const text = message?.text || "";
  const chatId = message?.chat?.id;

  try {
    if (!chatId) {
      res.status(200).json({ ok: true });
      return;
    }

    if (text.startsWith("/start")) {
      await sendMessage(BOT_TOKEN, chatId, "Открой форму для генерации:", {
        inline_keyboard: [[{ text: "🧾 Открыть форму", web_app: { url: WEBAPP_URL } }]]
      });
    } else {
      await sendMessage(BOT_TOKEN, chatId, "Напиши /start чтобы открыть форму.");
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(200).json({ ok: false, error: err?.message || "Unknown error" });
  }
}

async function sendMessage(token, chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: chatId, text, reply_markup: replyMarkup || undefined };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const j = await r.json();
  if (!j.ok) throw new Error(`Telegram sendMessage failed: ${JSON.stringify(j)}`);
}
