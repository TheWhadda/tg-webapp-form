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

const resultsGrid = $("#resultsGrid");

let titleTouched = false;
let subtitleTouched = false;
let lastTopic = "";

let aiAbort = null;
let submitAbort = null;

function setSubmitLoading(isLoading) {
  submitBtn.disabled = !!isLoading;
  submitBtn.classList.toggle("loading", !!isLoading);
}

function setIconLoading(btn, isLoading) {
  btn.classList.toggle("loading", !!isLoading);
  btn.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function showError(msg) {
  errorBox.hidden = !msg;
  errorBox.textContent = msg || "";
}

function hideResults() {
  resultsGrid.hidden = true;
  resultsGrid.innerHTML = "";
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

function getSelectedCount() {
  const checked = document.querySelector('input[name="count"]:checked');
  const v = checked ? parseInt(checked.value, 10) : 1;
  return Number.isFinite(v) ? v : 1;
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
  } catch (e) {
    showError(e?.message || "Ошибка AI");
  }
}

function filenameFor(url, idx, size) {
  // простое имя, чтобы download выглядел нормально
  const safeSize = (size || "img").replace(/[^0-9x]/g, "");
  return `tochka_${safeSize}_${String(idx + 1).padStart(2, "0")}.png`;
}

function renderResults(images, size) {
  const list = Array.isArray(images) ? images : [];
  const filtered = list.filter((it) => it && typeof it.url === "string" && it.url.trim());

  if (filtered.length === 0) {
    hideResults();
    throw new Error("В ответе нет изображений (result.images[].url).");
  }

  resultsGrid.innerHTML = "";

  filtered.forEach((it, idx) => {
    const url = it.url.trim();

    const item = document.createElement("div");
    item.className = "result-item";

    // миниатюра кликабельная (просто открыть)
    const aThumb = document.createElement("a");
    aThumb.href = url;
    aThumb.target = "_blank";
    aThumb.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.className = "result-thumb";
    img.loading = "lazy";
    img.alt = "Превью";
    img.src = url;

    aThumb.appendChild(img);

    // скачать
    const aDl = document.createElement("a");
    aDl.className = "download-btn";
    aDl.textContent = "Скачать";
    aDl.href = url;
    aDl.target = "_blank";
    aDl.rel = "noopener noreferrer";
    aDl.setAttribute("download", filenameFor(url, idx, size));

    item.appendChild(aThumb);
    item.appendChild(aDl);

    resultsGrid.appendChild(item);
  });

  resultsGrid.hidden = false;
}

async function submitGenerate() {
  const size = getSelectedSize();
  const count = getSelectedCount();

  const payload = {
    topic: topicEl.value.trim(),
    title: titleEl.value.trim(),
    subtitle: subtitleEl.value.trim(),
    size,
    count
  };

  if (!payload.topic) throw new Error("Заполните поле «Тема».");
  if (!payload.title) throw new Error("Заполните поле «Заголовок».");
  if (!payload.subtitle) throw new Error("Заполните поле «Подзаголовок».");

  if (submitAbort) submitAbort.abort();
  submitAbort = new AbortController();

  const resp = await postJson(SUBMIT_ENDPOINT, payload, submitAbort.signal);

  if (!resp?.ok) throw new Error(resp?.error || resp?.message || "Не удалось получить результат.");

  const images = resp?.result?.images;
  if (!Array.isArray(images)) throw new Error("Неверный формат: result.images должен быть массивом.");

  return { images, size };
}

/* init */
hideResults();

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
  } catch (e) {
    showError(e?.message || "Ошибка генерации подзаголовка");
  }
});

submitBtn.addEventListener("click", async () => {
  showError("");
  hideResults();
  setSubmitLoading(true);

  try {
    const { images, size } = await submitGenerate();
    renderResults(images, size);
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setSubmitLoading(false);
  }
});
