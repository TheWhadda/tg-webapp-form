/* =========================
   CONFIG
   ========================= */

const AI_ENDPOINT = "/api/ai";                 // Vercel proxy -> n8n
const SUBMIT_ENDPOINT = "/api/create_submit";  // генерация картинки

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
const jsStatusEl = $("#jsStatus");

/* =========================
   STATE
   ========================= */

let titleTouched = false;
let subtitleTouched = false;
let lastTopic = "";

let aiAbort = null;
let submitAbort = null;

/* =========================
   UI
   ========================= */

function setStatus(text) {
  if (jsStatusEl) jsStatusEl.textContent = text || "";
}

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

  if (thumbEl) {
    thumbEl.hidden = true;
    thumbEl.removeAttribute("src");
  }

  if (resultUrlEl) resultUrlEl.textContent = "";
  if (copyLinkBtn) copyLinkBtn.onclick = null;
  if (openLinkBtn) openLinkBtn.onclick = null;
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
    } catch {
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

  thumbEl.hidden = false;
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

  return data ?? text;
}

/* =========================
   Context builder (ВАЖНО)
   ========================= */

/**
 * Ты просил слать title/subtitle в поле context.
 * Я делаю context строкой — так проще для промпта/LLM в n8n.
 */
function buildContext() {
  const t = (titleEl?.value || "").trim();
  const s = (subtitleEl?.value || "").trim();
  return `title: ${t}\nsubtitle: ${s}`.trim();
}

/**
 * Поддержка твоего ответа:
 * { ok:true, fields:{ title/subtitle:"..." } }
 */
function extractText(resp, key) {
  if (typeof resp === "string") return resp.trim();

  const candidates = [
    resp?.[key],
    resp?.fields?.[key],     // ✅ твой формат
    resp?.result?.[key],
    resp?.data?.[key],
    resp?.text,
    resp?.fields?.text,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/* =========================
   AI: topic -> title -> subtitle
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

  setStatus("AI: заголовок…");

  const resp = await postJson(
    AI_ENDPOINT,
    {
      action: "title",
      topic,
      context: buildContext(),      // ✅ отправляем context
    },
    aiAbort.signal
  );

  const title = extractText(resp, "title");
  if (!title) throw new Error("AI ответил, но title не найден (ожидаю fields.title).");

  if (force || canOverwriteTitle()) {
    titleEl.value = title;
  }

  return title;
}

async function generateSubtitle(topic, title, { force = false } = {}) {
  if (!topic) return null;
  if (!force && !canOverwriteSubtitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  setStatus("AI: подзаголовок…");

  const resp = await postJson(
    AI_ENDPOINT,
    {
      action: "subtitle",
      topic,
      title,
      context: buildContext(),      // ✅ отправляем context
    },
    aiAbort.signal
  );

  const subtitle = extractText(resp, "subtitle");
  if (!subtitle) throw new Error("AI ответил, но subtitle не найден (ожидаю fields.subtitle).");

  if (force || canOverwriteSubtitle()) {
    subtitleEl.value = subtitle;
  }

  return subtitle;
}

async function autoGenerateFromTopic() {
  const topic = topicEl.value.trim();
  if (!topic) return;

  if (topic === lastTopic) return;
  lastTopic = topic;

  showError("");

  try {
    const t = await generateTitle(topic, { force: false });
    await generateSubtitle(topic, t, { force: false });

    setStatus("AI: готово ✅");
    setTimeout(() => setStatus(""), 700);
  } catch (e) {
    setStatus("");
    showError(e?.message || "Ошибка AI");
  }
}

/* =========================
   Submit (картинка)
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

  setStatus("Генерация изображения…");

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

setStatus("JS: loaded ✅");
hideResult();

titleEl.addEventListener("input", () => { titleTouched = true; });
subtitleEl.addEventListener("input", () => { subtitleTouched = true; });

topicEl.addEventListener("blur", autoGenerateFromTopic);
topicEl.addEventListener("change", autoGenerateFromTopic);
topicEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    topicEl.blur();
    autoGenerateFromTopic();
  }
});

regenTitleBtn.addEventListener("click", async () => {
  const topic = topicEl.value.trim();
  if (!topic) return showError("Сначала заполните «Тема».");

  showError("");
  try {
    const t = await generateTitle(topic, { force: true });
    await generateSubtitle(topic, t, { force: false });
    showToast("Заголовок обновлён");
    setStatus("");
  } catch (e) {
    setStatus("");
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
    setStatus("");
  } catch (e) {
    setStatus("");
    showError(e?.message || "Ошибка генерации подзаголовка");
  }
});

submitBtn.addEventListener("click", async () => {
  showError("");
  hideResult();       // ✅ результат только после ответа
  setLoading(true);

  try {
    const url = await submitGenerate();
    renderResult(url);
    setStatus("");
  } catch (e) {
    setStatus("");
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});
