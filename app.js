/* =========================
   CONFIG (поставь свои URL)
   ========================= */

// 1) Вжух (у тебя в репе есть api/create_submit.js → это точно верно для Vercel)
const SUBMIT_ENDPOINT = "/api/create_submit";

// 2) Генерация заголовка по теме (поставь свой endpoint)
const TITLE_ENDPOINT = ""; // например: "https://n8n.yourdomain/webhook/title"

// 3) Генерация подзаголовка по теме+заголовку (поставь свой endpoint)
const SUBTITLE_ENDPOINT = ""; // например: "https://n8n.yourdomain/webhook/subtitle"


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

let titleAbort = null;
let subtitleAbort = null;
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
  // чтобы не было “битого” превью
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
   Networking helpers
   ========================= */

async function postJson(url, body, abortSignal) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  // Vercel API может вернуть не-JSON при ошибке — обрабатываем аккуратно
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}

  if (!r.ok) {
    const msg = data?.error || data?.message || text || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data ?? {};
}


/* =========================
   Title/Subitle generation
   ========================= */

function canAutoOverwriteTitle() {
  // Не трогаем заголовок, если юзер уже редактировал
  return !titleTouched && !titleEl.value.trim();
}

function canAutoOverwriteSubtitle() {
  return !subtitleTouched && !subtitleEl.value.trim();
}

async function generateTitleFromTopic(topic, { force = false } = {}) {
  if (!TITLE_ENDPOINT) {
    // Если endpoint не задан — просто не делаем ничего (чтобы не ломать)
    return null;
  }

  if (!force && !canAutoOverwriteTitle()) return null;

  if (titleAbort) titleAbort.abort();
  titleAbort = new AbortController();

  const resp = await postJson(
    TITLE_ENDPOINT,
    { topic },
    titleAbort.signal
  );

  // ожидаем, что сервер вернёт { title: "..." } или { result: { title: "..." } }
  const title = resp?.title || resp?.result?.title || resp?.data?.title;
  if (title && (force || canAutoOverwriteTitle())) {
    titleEl.value = title;
  }
  return title || null;
}

async function generateSubtitleFromTopic(topic, title, { force = false } = {}) {
  if (!SUBTITLE_ENDPOINT) {
    return null;
  }

  if (!force && !canAutoOverwriteSubtitle()) return null;

  if (subtitleAbort) subtitleAbort.abort();
  subtitleAbort = new AbortController();

  const resp = await postJson(
    SUBTITLE_ENDPOINT,
    { topic, title },
    subtitleAbort.signal
  );

  // ожидаем { subtitle: "..." } или { result: { subtitle: "..." } }
  const subtitle = resp?.subtitle || resp?.result?.subtitle || resp?.data?.subtitle;
  if (subtitle && (force || canAutoOverwriteSubtitle())) {
    subtitleEl.value = subtitle;
  }
  return subtitle || null;
}

/**
 * Автопайплайн: blur темы → заголовок → подзаголовок
 * - срабатывает только если тема изменилась
 * - не перетирает вручную введённые поля
 */
async function autoGenerateFromTopic() {
  const topic = topicEl.value.trim();
  if (!topic) return;

  // чтобы не спамить если blur случается много раз без изменений
  if (topic === lastTopicValue) return;
  lastTopicValue = topic;

  showError("");

  try {
    const title = await generateTitleFromTopic(topic, { force: false });
    await generateSubtitleFromTopic(topic, title || titleEl.value.trim(), { force: false });
  } catch (e) {
    // автогенерация не должна ломать UX — показываем мягко
    showError(e?.message || "Ошибка автогенерации");
  }
}


/* =========================
   Submit (Вжух)
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

  // ожидаем твой формат: { ok:true, result:{ images:[{url:"..."}] } }
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

// Фикс: отмечаем, что юзер руками менял заголовок/подзаголовок
titleEl.addEventListener("input", () => { titleTouched = true; });
subtitleEl.addEventListener("input", () => { subtitleTouched = true; });

// Автогенерация: по blur поля “Тема”
topicEl.addEventListener("blur", () => {
  autoGenerateFromTopic();
});

// Кнопка перегенерации заголовка (force)
regenTitleBtn.addEventListener("click", async () => {
  const topic = topicEl.value.trim();
  if (!topic) return showError("Сначала заполните «Тема».");

  showError("");
  try {
    // если нажали кнопку — это осознанное действие → force
    await generateTitleFromTopic(topic, { force: true });
    // после принудительного заголовка логично обновить подзаголовок тоже, если его не трогали руками
    await generateSubtitleFromTopic(topic, titleEl.value.trim(), { force: false });
    showToast("Заголовок обновлён");
  } catch (e) {
    showError(e?.message || "Ошибка генерации заголовка");
  }
});

// Кнопка перегенерации подзаголовка (force)
regenSubtitleBtn.addEventListener("click", async () => {
  const topic = topicEl.value.trim();
  if (!topic) return showError("Сначала заполните «Тема».");

  showError("");
  try {
    await generateSubtitleFromTopic(topic, titleEl.value.trim(), { force: true });
    showToast("Подзаголовок обновлён");
  } catch (e) {
    showError(e?.message || "Ошибка генерации подзаголовка");
  }
});

// Вжух
submitBtn.addEventListener("click", async () => {
  showError("");
  hideResult();          // ✅ результат исчезает на старте
  setLoading(true);

  try {
    const url = await submitGenerate();
    renderResult(url);   // ✅ результат появляется только после ответа
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});

// На старте результат всегда скрыт
hideResult();
