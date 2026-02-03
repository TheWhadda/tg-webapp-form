/* =========================
   CONFIG
   ========================= */

// Один вебхук на генерацию title/subtitle
const AI_WEBHOOK = "https://broakk72.app.n8n.cloud/webhook/tg-form/ai";

// Вжух (если у тебя Vercel API как раньше)
const SUBMIT_ENDPOINT = "/api/create_submit";

/* =========================
   DOM
   ========================= */

const $ = (sel) => document.querySelector(sel);

const topicEl = $("#topic");
const titleEl = $("#title");
const subtitleEl = $("#subtitle");

const regenTitleBtn = $("#regenTitle");
const regenSubtitleBtn = $("#regenSubtitle");

const submitBtn = $("#submit");
const errorBox = $("#error");

const resultCard = $("#resultCard");
const thumbEl = $("#thumb");
const resultUrlEl = $("#resultUrl");
const copyLinkBtn = $("#copyLink");
const openLinkBtn = $("#openLink");

const toastEl = $("#toast");

/* =========================
   STATE
   ========================= */

let titleTouched = false;
let subtitleTouched = false;
let lastTopicValue = "";

let aiAbort = null;
let submitAbort = null;

/* =========================
   UI helpers
   ========================= */

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
}

function showError(msg) {
  errorBox.hidden = !msg;
  errorBox.textContent = msg || "";
}

function showToast(text = "Скопировано") {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toastEl.hidden = true), 1200);
}

function hideResult() {
  resultCard.hidden = true;
  thumbEl.removeAttribute("src");
  resultUrlEl.textContent = "";
  copyLinkBtn.onclick = null;
  openLinkBtn.onclick = null;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch (e) {
      return false;
    }
  }
}

function getSelectedSize() {
  const checked = document.querySelector('input[name="size"]:checked');
  return checked ? checked.value : "600x600";
}

function renderResult(url) {
  if (!url) return;

  resultCard.hidden = false;
  thumbEl.src = url;
  resultUrlEl.textContent = url;

  copyLinkBtn.onclick = async () => {
    const ok = await copyToClipboard(url);
    showToast(ok ? "Скопировано" : "Не удалось скопировать");
  };

  openLinkBtn.onclick = () => window.open(url, "_blank", "noopener,noreferrer");
}

/* =========================
   Networking
   ========================= */

async function postJson(url, body, signal) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}

  if (!r.ok) {
    const msg = data?.error || data?.message || text || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data ?? {};
}

/**
 * Достаём title/subtitle из любого разумного формата n8n:
 * - { title: "..." }
 * - { subtitle: "..." }
 * - { result: { title: "..." } }
 * - { result: { subtitle: "..." } }
 * - { data: { ... } }
 * - "просто строка" (если n8n вернул plain text)
 */
function extractText(resp, key) {
  if (typeof resp === "string") return resp;

  const direct = resp?.[key];
  if (typeof direct === "string") return direct;

  const r1 = resp?.result?.[key];
  if (typeof r1 === "string") return r1;

  const r2 = resp?.data?.[key];
  if (typeof r2 === "string") return r2;

  const r3 = resp?.output?.[key];
  if (typeof r3 === "string") return r3;

  // иногда n8n возвращает { text: "..." }
  if (key === "title" || key === "subtitle") {
    const t = resp?.text || resp?.result?.text || resp?.data?.text;
    if (typeof t === "string") return t;
  }

  return null;
}

/* =========================
   AI generation (one webhook)
   ========================= */

function canAutoOverwriteTitle() {
  return !titleTouched && !titleEl.value.trim();
}
function canAutoOverwriteSubtitle() {
  return !subtitleTouched && !subtitleEl.value.trim();
}

/**
 * Генерация заголовка через один вебхук
 * payload: { action:"title", topic }
 */
async function generateTitle(topic, { force = false } = {}) {
  if (!force && !canAutoOverwriteTitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  const resp = await postJson(
    AI_WEBHOOK,
    { action: "title", topic },
    aiAbort.signal
  );

  const title = extractText(resp, "title");
  if (title && (force || canAutoOverwriteTitle())) {
    titleEl.value = title;
  }
  return title || null;
}

/**
 * Генерация подзаголовка через один вебхук
 * payload: { action:"subtitle", topic, title }
 */
async function generateSubtitle(topic, title, { force = false } = {}) {
  if (!force && !canAutoOverwriteSubtitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  const resp = await postJson(
    AI_WEBHOOK,
    { action: "subtitle", topic, title },
    aiAbort.signal
  );

  const subtitle = extractText(resp, "subtitle");
  if (subtitle && (force || canAutoOverwriteSubtitle())) {
    subtitleEl.value = subtitle;
  }
  return subtitle || null;
}

/**
 * blur темы → title → subtitle
 * - только если тема изменилась
 * - не перетирает поля, если юзер уже редактировал
 */
async function autoGenerateFromTopic() {
  const topic = topicEl.value.trim();
  if (!topic) return;

  if (topic === lastTopicValue) return;
  lastTopicValue = topic;

  showError("");

  try {
    const t = await generateTitle(topic, { force: false });
    const finalTitle = t || titleEl.value.trim();
    await generateSubtitle(topic, finalTitle, { force: false });
  } catch (e) {
    showError(e?.message || "Ошибка автогенерации");
  }
}

/* =========================
   Submit
   ========================= */

async function submitGenerate() {
  const payload = {
    topic: topicEl.value.trim(),
    title: titleEl.value.trim(),
    subtitle: subtitleEl.value.trim(),
    size: getSelectedSize(),
  };

  if (!payload.topic) throw new Error("Заполните поле «Тема».");
  if (!payload.title) throw new Error("Заполните поле «Заголовок».");
  if (!payload.subtitle) throw new Error("Заполните поле «Подзаголовок».");

  if (submitAbort) submitAbort.abort();
  submitAbort = new AbortController();

  const resp = await postJson(SUBMIT_ENDPOINT, payload, submitAbort.signal);

  if (!resp?.ok) {
    throw new Error(resp?.error || resp?.message || "Не удалось получить результат.");
  }

  const url = resp?.result?.images?.[0]?.url;
  if (!url) throw new Error("В ответе нет url изображения.");

  return url;
}

/* =========================
   Events
   ========================= */

titleEl.addEventListener("input", () => { titleTouched = true; });
subtitleEl.addEventListener("input", () => { subtitleTouched = true; });

// ✅ вернули авто-цепочку по blur темы
topicEl.addEventListener("blur", () => {
  autoGenerateFromTopic();
});

// ↻ заголовок (force)
regenTitleBtn.addEventListener("click", async () => {
  const topic = topicEl.value.trim();
  if (!topic) return showError("Сначала заполните «Тема».");

  showError("");
  try {
    await generateTitle(topic, { force: true });
    // подзаголовок обновляем только если юзер его не трогал
    await generateSubtitle(topic, titleEl.value.trim(), { force: false });
    showToast("Заголовок обновлён");
  } catch (e) {
    showError(e?.message || "Ошибка генерации заголовка");
  }
});

// ↻ подзаголовок (force)
regenSubtitleBtn.addEventListener("click", async () => {
  const topic = topicEl.value.trim();
  if (!topic) return showError("Сначала заполните «Тема».");

  showError("");
  try {
    await generateSubtitle(topic, titleEl.value.trim(), { force: true });
    showToast("Подзаголовок обновлён");
  } catch (e) {
    showError(e?.message || "Ошибка генерации подзаголовка");
  }
});

// ✅ результат появляется только после ответа
submitBtn.addEventListener("click", async () => {
  showError("");
  hideResult();     // прячем сразу
  setLoading(true);

  try {
    const url = await submitGenerate();
    renderResult(url); // показываем только после успеха
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});

// На старте результат скрыт
hideResult();
