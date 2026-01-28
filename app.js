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

/* ================= helpers ================= */

function getSizes() {
  return Array.from(document.querySelectorAll(".check input:checked")).map(i => i.value);
}

function getDraft() {
  return {
    topic: topic.value.trim(),
    title: title.value.trim(),
    subtitle: subtitle.value.trim(),
    sizes: getSizes(),
  };
}

function setStatus(text, type = "") {
  globalStatus.textContent = text || "";
  globalStatus.dataset.type = type;
}

function setBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = busy;
}

function setAllBusy(busy) {
  regenTitle.disabled = busy;
  regenSubtitle.disabled = busy;
  submitBtn.disabled = busy;
}

async function postJSON(url, payload, { timeoutMs = 20000 } = {}) {
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
      json = { ok: false, error: "Invalid JSON" };
    }

    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` };
    }

    return json;
  } catch (e) {
    if (e.name === "AbortError") return { ok: false, error: "timeout" };
    return { ok: false, error: "network error" };
  } finally {
    clearTimeout(t);
  }
}

/* ================= generation ================= */

async function regenerate(field, { silent = false } = {}) {
  if (!topic.value.trim()) return;

  const btn = field === "title" ? regenTitle : regenSubtitle;
  setBusy(btn, true);
  if (!silent) setStatus("Генерация…", "info");

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
    if (!silent) setStatus("Готово ✓", "ok");
    setBusy(btn, false);
    return true;
  } else {
    if (!silent) setStatus(`Ошибка: ${json?.error || "нет поля в ответе"}`, "err");
    setBusy(btn, false);
    return false;
  }
}

/* ================= auto flow from topic ================= */

// чтобы не триггерилось много раз
let topicAutoTriggered = false;

topic.addEventListener("blur", async () => {
  const value = topic.value.trim();
  if (!value) return;

  // если уже запускали — не повторяем
  if (topicAutoTriggered) return;

  // если оба поля уже заполнены — не надо
  if (title.value.trim() && subtitle.value.trim()) return;

  topicAutoTriggered = true;
  setStatus("Генерация заголовка…", "info");

  // 1) title
  if (!title.value.trim()) {
    const okTitle = await regenerate("title", { silent: true });
    if (!okTitle) {
      setStatus("Ошибка генерации заголовка", "err");
      return;
    }
  }

  // 2) subtitle
  if (!subtitle.value.trim()) {
    setStatus("Генерация подзаголовка…", "info");
    const okSub = await regenerate("subtitle", { silent: true });
    if (!okSub) {
      setStatus("Ошибка генерации подзаголовка", "err");
      return;
    }
  }

  setStatus("Готово ✓", "ok");
});

/* ================= submit ================= */

async function submit() {
  if (!topic.value.trim()) {
    setStatus("Ошибка: заполни тему", "err");
    topic.focus();
    return;
  }

  if (getSizes().length === 0) {
    setStatus("Ошибка: выбери размер", "err");
    return;
  }

  setAllBusy(true);
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

  setAllBusy(false);
}

/* ================= bindings ================= */

regenTitle.onclick = () => regenerate("title");
regenSubtitle.onclick = () => regenerate("subtitle");
submitBtn.onclick = submit;
