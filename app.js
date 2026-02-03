/* =========================
   CONFIG
   ========================= */

// Один вебхук n8n для генерации title/subtitle
const AI_WEBHOOK = "https://broakk72.app.n8n.cloud/webhook/tg-form/ai";

// Endpoint для "Вжух" (у тебя в репе есть api/create_submit.js)
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

let lastTopic = "";

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
  if (!resultCard) return;
  resultCard.hidden = true;
  if (thumbEl) thumbEl.removeAttribute("src");
  if (resultUrlEl) resultUrlEl.textContent = "";
  if (copyLinkBtn) copyLinkBtn.onclick = null;
  if (openLinkBtn) openLinkBtn.onclick = null;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // fallback для некоторых WebView
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

  // n8n иногда отдаёт text/plain — читаем текст и пытаемся распарсить
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}

  if (!r.ok) {
    const msg = data?.error || data?.message || text || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data ?? text; // если не JSON — вернём строку
}

/**
 * Достаём текст из ответа n8n максимально устойчиво:
 * - если ответ строка → используем её
 * - если JSON: ищем ключ или вложенные варианты
 */
function extractText(resp, key) {
  if (typeof resp === "string") return resp.trim();

  const candidates = [
    resp?.[key],
    resp?.result?.[key],
    resp?.data?.[key],
    resp?.output?.[key],
    resp?.text,
    resp?.result?.text,
    resp?.data?.text,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/* =========================
   AI logic: auto title -> subtitle
   ========================= */

function canOverwriteTitle() {
  return !titleTouched && !titleEl.value.trim();
}

function canOverwriteSubtitle() {
  return !subtitleTouched && !subtitleEl.value.trim();
}

async function generateTitle(topic, { force = false } = {}) {
  if (!topic) return null;
  if (!force && !canOverwriteTitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  const resp = await postJson(
    AI_WEBHOOK,
    { action: "title", topic },
    aiAbort.signal
  );

  const title = extractText(resp, "title");
  if (title && (force || canOverwriteTitle())) {
    titleEl.value = title;
  }
  return title || null;
}

async function generateSubtitle(topic, title, { force = false } = {}) {
  if (!topic) return null;
  if (!force && !canOverwriteSubtitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  const resp = await postJson(
    AI_WEBHOOK,
    { action: "subtitle", topic, title },
    aiAbort.signal
  );

  const subtitle = extractText(resp, "subtitle");
  if (subtitle && (force || canOverwriteSubtitle())) {
    subtitleEl.value = subtitle;
  }
  return subtitle || null;
}

/**
 * Триггер: тема изменилась → title → subtitle
 * Срабатывает:
 * - blur
 * - change
 * - Enter
 */
async function autoGenerateFromTopic() {
  const topic = topicEl.value.trim();
  if (!topic) return;

  // не спамим если тема не менялась
  if (topic === lastTopic) return;
  lastTopic = topic;

  showError("");

  try {
    const t = await generateTitle(topic, { force: false });
    const finalTitle = t || titleEl.value.trim();
    await generateSubtitle(topic, finalTitle, { force: false });
  } catch (e) {
    // автогенерация не должна убивать UX, но ошибку показываем
    showError(e?.message || "Ошибка генерации");
  }
}

/* =========================
   Submit: show result only after response
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

  // ожидаем формат: { ok: true, result: { images: [ { url } ] } }
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

// 0) На старте — результат скрыт всегда
hideResult();

// 1) Если юзер руками редактирует — автогенерация больше не перетирает
titleEl.addEventListener("input", () => { titleTouched = true; });
subtitleEl.addEventListener("input", () => { subtitleTouched = true; });

// 2) Автогенерация после темы
topicEl.addEventListener("blur", autoGenerateFromTopic);
topicEl.addEventListener("change", autoGenerateFromTopic);
topicEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // чтобы Enter не делал ничего странного в webview
    e.preventDefault();
    topicEl.blur(); // гарантируем blur
    autoGenerateFromTopic();
  }
});

// 3) Кнопки ↻
regenTitleBtn.addEventListener("click", async () => {
  const topic = topicEl.value.trim();
  if (!topic) return showError("Сначала заполните «Тема».");

  showError("");
  try {
    await generateTitle(topic, { force: true });
    // subtitle обновляем только если его не трогали руками
    await generateSubtitle(topic, titleEl.value.trim(), { force: false });
    showToast("Заголовок обновлён");
  } catch (e) {
    showError(e?.message || "Ошибка генерации заголовка");
  }
});

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

// 4) Вжух: прячем результат сразу, показываем только после ответа
submitBtn.addEventListener("click", async () => {
  showError("");
  hideResult();       // ✅ сразу прячем
  setLoading(true);

  try {
    const url = await submitGenerate();
    renderResult(url); // ✅ показываем только после success
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});
/* =========================
   CONFIG
   ========================= */

// Один вебхук n8n для генерации title/subtitle
const AI_WEBHOOK = "https://broakk72.app.n8n.cloud/webhook/tg-form/ai";

// Endpoint для "Вжух" (у тебя в репе есть api/create_submit.js)
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

let lastTopic = "";

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
  if (!resultCard) return;
  resultCard.hidden = true;
  if (thumbEl) thumbEl.removeAttribute("src");
  if (resultUrlEl) resultUrlEl.textContent = "";
  if (copyLinkBtn) copyLinkBtn.onclick = null;
  if (openLinkBtn) openLinkBtn.onclick = null;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // fallback для некоторых WebView
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

  // n8n иногда отдаёт text/plain — читаем текст и пытаемся распарсить
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}

  if (!r.ok) {
    const msg = data?.error || data?.message || text || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data ?? text; // если не JSON — вернём строку
}

/**
 * Достаём текст из ответа n8n максимально устойчиво:
 * - если ответ строка → используем её
 * - если JSON: ищем ключ или вложенные варианты
 */
function extractText(resp, key) {
  if (typeof resp === "string") return resp.trim();

  const candidates = [
    resp?.[key],
    resp?.result?.[key],
    resp?.data?.[key],
    resp?.output?.[key],
    resp?.text,
    resp?.result?.text,
    resp?.data?.text,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/* =========================
   AI logic: auto title -> subtitle
   ========================= */

function canOverwriteTitle() {
  return !titleTouched && !titleEl.value.trim();
}

function canOverwriteSubtitle() {
  return !subtitleTouched && !subtitleEl.value.trim();
}

async function generateTitle(topic, { force = false } = {}) {
  if (!topic) return null;
  if (!force && !canOverwriteTitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  const resp = await postJson(
    AI_WEBHOOK,
    { action: "title", topic },
    aiAbort.signal
  );

  const title = extractText(resp, "title");
  if (title && (force || canOverwriteTitle())) {
    titleEl.value = title;
  }
  return title || null;
}

async function generateSubtitle(topic, title, { force = false } = {}) {
  if (!topic) return null;
  if (!force && !canOverwriteSubtitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  const resp = await postJson(
    AI_WEBHOOK,
    { action: "subtitle", topic, title },
    aiAbort.signal
  );

  const subtitle = extractText(resp, "subtitle");
  if (subtitle && (force || canOverwriteSubtitle())) {
    subtitleEl.value = subtitle;
  }
  return subtitle || null;
}

/**
 * Триггер: тема изменилась → title → subtitle
 * Срабатывает:
 * - blur
 * - change
 * - Enter
 */
async function autoGenerateFromTopic() {
  const topic = topicEl.value.trim();
  if (!topic) return;

  // не спамим если тема не менялась
  if (topic === lastTopic) return;
  lastTopic = topic;

  showError("");

  try {
    const t = await generateTitle(topic, { force: false });
    const finalTitle = t || titleEl.value.trim();
    await generateSubtitle(topic, finalTitle, { force: false });
  } catch (e) {
    // автогенерация не должна убивать UX, но ошибку показываем
    showError(e?.message || "Ошибка генерации");
  }
}

/* =========================
   Submit: show result only after response
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

  // ожидаем формат: { ok: true, result: { images: [ { url } ] } }
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

// 0) На старте — результат скрыт всегда
hideResult();

// 1) Если юзер руками редактирует — автогенерация больше не перетирает
titleEl.addEventListener("input", () => { titleTouched = true; });
subtitleEl.addEventListener("input", () => { subtitleTouched = true; });

// 2) Автогенерация после темы
topicEl.addEventListener("blur", autoGenerateFromTopic);
topicEl.addEventListener("change", autoGenerateFromTopic);
topicEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // чтобы Enter не делал ничего странного в webview
    e.preventDefault();
    topicEl.blur(); // гарантируем blur
    autoGenerateFromTopic();
  }
});

// 3) Кнопки ↻
regenTitleBtn.addEventListener("click", async () => {
  const topic = topicEl.value.trim();
  if (!topic) return showError("Сначала заполните «Тема».");

  showError("");
  try {
    await generateTitle(topic, { force: true });
    // subtitle обновляем только если его не трогали руками
    await generateSubtitle(topic, titleEl.value.trim(), { force: false });
    showToast("Заголовок обновлён");
  } catch (e) {
    showError(e?.message || "Ошибка генерации заголовка");
  }
});

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

// 4) Вжух: прячем результат сразу, показываем только после ответа
submitBtn.addEventListener("click", async () => {
  showError("");
  hideResult();       // ✅ сразу прячем
  setLoading(true);

  try {
    const url = await submitGenerate();
    renderResult(url); // ✅ показываем только после success
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});
