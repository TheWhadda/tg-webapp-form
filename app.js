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

/** UI helpers */
function setStatus(text, type = "") {
  globalStatus.textContent = text || "";
  globalStatus.dataset.type = type; // если захочешь стилизовать: [data-type="err"] { color: ... }
}

function setBusy(button, busy, label = null) {
  if (!button) return;
  if (busy) {
    button.dataset.prevText = button.textContent;
    button.disabled = true;
    button.textContent = label ?? "…";
  } else {
    button.disabled = false;
    if (button.dataset.prevText) button.textContent = button.dataset.prevText;
    delete button.dataset.prevText;
  }
}

function setAllBusy(busy) {
  // при submit блокируем всё
  regenTitle.disabled = busy;
  regenSubtitle.disabled = busy;
  submitBtn.disabled = busy;
}

/** Network with timeout */
async function postJSON(url, payload, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

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
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, error: "timeout" };
    return { ok: false, error: e?.message || "network error" };
  } finally {
    clearTimeout(t);
  }
}

function validateBasic() {
  if (!topic.value.trim()) {
    setStatus("Ошибка: заполни поле «Тема»", "err");
    topic.focus();
    return false;
  }
  if (getSizes().length === 0) {
    setStatus("Ошибка: выбери хотя бы один размер", "err");
    return false;
  }
  return true;
}

async function regenerate(field) {
  if (!validateBasic()) return;

  const btn = field === "title" ? regenTitle : regenSubtitle;
  setBusy(btn, true, "⟳");
  setStatus("Генерация…", "info");

  const payload = {
    initData: tg?.initData || "",
    action: "regenerate",
    target_fields: [field],
    draft: getDraft(),
  };

  const json = await postJSON(AI_URL, payload, { timeoutMs: 20000 });

  if (json?.ok && json?.fields?.[field]) {
    if (field === "title") title.value = json.fields[field];
    if (field === "subtitle") subtitle.value = json.fields[field];
    setStatus("Готово ✓", "ok");
  } else {
    const msg = json?.error ? `Ошибка: ${json.error}` : "Ошибка: нет поля в ответе";
    setStatus(msg, "err");
  }

  setBusy(btn, false);
}

async function submit() {
  if (!validateBasic()) return;

  setAllBusy(true);
  const prevText = submitBtn.textContent;
  submitBtn.textContent = "Генерация…";
  setStatus("Отправка…", "info");

  const payload = {
    initData: tg?.initData || "",
    action: "submit",
    draft: getDraft(),
  };

  const json = await postJSON(SUBMIT_URL, payload, { timeoutMs: 30000 });

  if (json?.ok) {
    setStatus("Готово ✓", "ok");
  } else {
    setStatus(`Ошибка: ${json?.error || "unknown"}`, "err");
  }

  submitBtn.textContent = prevText;
  setAllBusy(false);
}

regenTitle.onclick = () => regenerate("title");
regenSubtitle.onclick = () => regenerate("subtitle");
submitBtn.onclick = submit;
