const AI_ENDPOINT = "/api/ai";
const SUBMIT_ENDPOINT = "/api/submit";

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
const copyLinkBtn = $("#copyLink");
const openLinkBtn = $("#openLink");

const toastEl = $("#toast");
const jsStatusEl = $("#jsStatus");

let titleTouched = false;
let subtitleTouched = false;
let lastTopic = "";

let aiAbort = null;
let submitAbort = null;

let lastImageUrl = "";

function setStatus(text) {
  if (jsStatusEl) jsStatusEl.textContent = text || "";
}

function setSubmitLoading(isLoading) {
  submitBtn.disabled = !!isLoading;
  submitBtn.classList.toggle("loading", !!isLoading);
}

function setIconLoading(btn, isLoading) {
  btn.disabled = !!isLoading;
  btn.classList.toggle("loading", !!isLoading);
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
  lastImageUrl = "";
  resultCard.hidden = true;

  thumbEl.hidden = true;
  thumbEl.removeAttribute("src");

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
    } catch {
      return false;
    }
  }
}

function renderResult(url) {
  lastImageUrl = url || "";
  if (!lastImageUrl) return;

  resultCard.hidden = false;

  thumbEl.hidden = false;
  thumbEl.src = lastImageUrl;

  copyLinkBtn.onclick = async () => {
    const ok = await copyToClipboard(lastImageUrl);
    showToast(ok ? "Ссылка скопирована" : "Не удалось скопировать");
  };

  openLinkBtn.onclick = () => window.open(lastImageUrl, "_blank", "noopener,noreferrer");
}

function buildContext() {
  const t = (titleEl.value || "").trim();
  const s = (subtitleEl.value || "").trim();
  if (t && s) return `${t}\n\n${s}`;
  return t || s || "";
}

function getSelectedSize() {
  const checked = document.querySelector('input[name="size"]:checked');
  return checked ? checked.value : "600x600";
}

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

function extractText(resp, key) {
  if (typeof resp === "string") return resp.trim();
  const cands = [resp?.[key], resp?.fields?.[key], resp?.text];
  for (const c of cands) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

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

  setIconLoading(regenTitleBtn, true);
  setStatus("AI: заголовок…");

  try {
    const resp = await postJson(
      AI_ENDPOINT,
      { action: "title", topic, context: buildContext() },
      aiAbort.signal
    );

    const t = extractText(resp, "title");
    if (!t) throw new Error("AI ответил, но title не найден (fields.title).");

    if (force || canOverwriteTitle()) titleEl.value = t;
    return t;
  } finally {
    setIconLoading(regenTitleBtn, false);
  }
}

async function generateSubtitle(topic, title, { force = false } = {}) {
  if (!topic) return null;
  if (!force && !canOverwriteSubtitle()) return null;

  if (aiAbort) aiAbort.abort();
  aiAbort = new AbortController();

  setIconLoading(regenSubtitleBtn, true);
  setStatus("AI: подзаголовок…");

  try {
    const resp = await postJson(
      AI_ENDPOINT,
      { action: "subtitle", topic, title, context: buildContext() },
      aiAbort.signal
    );

    const s = extractText(resp, "subtitle");
    if (!s) throw new Error("AI ответил, но subtitle не найден (fields.subtitle).");

    if (force || canOverwriteSubtitle()) subtitleEl.value = s;
    return s;
  } finally {
    setIconLoading(regenSubtitleBtn, false);
  }
}

async function autoGenerateFromTopic() {
  const topic = topicEl.value.trim();
  if (!topic) return;
  if (topic === lastTopic) return;
  lastTopic = topic;

  showError("");

  try {
    const t = await generateTitle(topic, { force: false });
    const finalTitle = t || titleEl.value.trim();
    await generateSubtitle(topic, finalTitle, { force: false });

    setStatus("AI: готово ✅");
    setTimeout(() => setStatus(""), 700);
  } catch (e) {
    setStatus("");
    showError(e?.message || "Ошибка AI");
  }
}

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

  if (!resp?.ok) throw new Error(resp?.error || resp?.message || "Не удалось получить результат.");

  const url = resp?.result?.images?.[0]?.url;
  if (!url) throw new Error("В ответе нет url изображения.");

  return url;
}

/* init */
setStatus("JS: loaded ✅");

// ✅ прячем сразу, до любых запросов
hideResult();

// marks
titleEl.addEventListener("input", () => { titleTouched = true; });
subtitleEl.addEventListener("input", () => { subtitleTouched = true; });

// auto from topic
topicEl.addEventListener("blur", autoGenerateFromTopic);
topicEl.addEventListener("change", autoGenerateFromTopic);
topicEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    topicEl.blur();
    autoGenerateFromTopic();
  }
});

// buttons
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
  hideResult();            // ✅ скрываем до ответа
  setSubmitLoading(true);

  try {
    const url = await submitGenerate();
    renderResult(url);     // ✅ показываем после ответа
    setStatus("");
  } catch (e) {
    setStatus("");
    showError(e?.message || "Ошибка");
  } finally {
    setSubmitLoading(false);
  }
});
