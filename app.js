// Теперь WebApp ходит на свои же API-роуты (Vercel), а Vercel уже проксирует в n8n.
// Это убирает CORS.
const AI_URL = "/api/ai";
const SUBMIT_URL = "/api/submit";

const tg = window.Telegram?.WebApp;
tg?.ready();

const topic = document.getElementById("topic");
const title = document.getElementById("title");
const subtitle = document.getElementById("subtitle");

const regenTitle = document.getElementById("regenTitle");
const regenSubtitle = document.getElementById("regenSubtitle");
const submitBtn = document.getElementById("submitBtn");

const globalStatus = document.getElementById("globalStatus");

function getSizes() {
  return Array.from(document.querySelectorAll(".check input:checked")).map((i) => i.value);
}

function getDraft() {
  return {
    topic: topic.value.trim(),
    title: title.value.trim(),
    subtitle: subtitle.value.trim(),
    sizes: getSizes(),
  };
}

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // На ошибках тоже пытаемся прочитать тело, чтобы показать полезное сообщение
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { ok: false, error: "Invalid JSON response", raw: text };
  }

  if (!res.ok) {
    return { ok: false, error: json?.error || `HTTP ${res.status}`, details: json };
  }
  return json;
}

async function regenerate(field) {
  globalStatus.textContent = "Генерация…";

  const payload = {
    initData: tg?.initData || "",
    action: "regenerate",
    target_fields: [field],
    draft: getDraft(),
  };

  const json = await postJSON(AI_URL, payload);

  if (json?.ok && json?.fields?.[field]) {
    if (field === "title") title.value = json.fields[field];
    if (field === "subtitle") subtitle.value = json.fields[field];
    globalStatus.textContent = "Готово";
  } else {
    globalStatus.textContent = `Ошибка: ${json?.error || "нет поля в ответе"}`;
  }
}

async function submit() {
  globalStatus.textContent = "Отправка…";

  const payload = {
    initData: tg?.initData || "",
    action: "submit",
    draft: getDraft(),
  };

  const json = await postJSON(SUBMIT_URL, payload);
  globalStatus.textContent = json?.ok ? "Готово" : `Ошибка: ${json?.error || "unknown"}`;
}

regenTitle.onclick = () => regenerate("title");
regenSubtitle.onclick = () => regenerate("subtitle");
submitBtn.onclick = submit;
