const $ = (sel) => document.querySelector(sel);

const submitBtn = $("#submit");
const errorBox = $("#error");

const resultCard = $("#resultCard");
const thumbEl = $("#thumb");
const resultUrlEl = $("#resultUrl");
const copyLinkBtn = $("#copyLink");
const openLinkBtn = $("#openLink");

const toastEl = $("#toast");
const cssStatusEl = $("#cssStatus");

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
  resultCard.hidden = false;
  thumbEl.src = url;
  resultUrlEl.textContent = url;

  copyLinkBtn.onclick = async () => {
    const ok = await copyToClipboard(url);
    showToast(ok ? "Скопировано" : "Не удалось скопировать");
  };

  openLinkBtn.onclick = () => window.open(url, "_blank", "noopener,noreferrer");
}

/* Диагностика: если CSS не применился — покажем плашку */
function checkCssLoaded() {
  const card = document.querySelector(".card");
  if (!card) return;

  const bg = getComputedStyle(card).backgroundImage || "";
  const looksStyled = bg.includes("radial-gradient") || bg.includes("linear-gradient");

  if (!looksStyled) {
    cssStatusEl.hidden = false;
    cssStatusEl.textContent =
      "CSS NOT LOADED. Проверь, что style.css доступен по тому же пути, что и index.html. " +
      "И добавь cache-busting (?v=...).";
  } else {
    cssStatusEl.hidden = true;
  }
}

checkCssLoaded();

async function generateImage() {
  const payload = {
    topic: $("#topic").value.trim(),
    title: $("#title").value.trim(),
    subtitle: $("#subtitle").value.trim(),
    size: getSelectedSize(),
  };

  if (!payload.topic) throw new Error("Заполните поле «Тема».");
  if (!payload.title) throw new Error("Заполните поле «Заголовок».");
  if (!payload.subtitle) throw new Error("Заполните поле «Подзаголовок».");

  // TODO: заменить на твой endpoint
  return {
    ok: true,
    result: {
      images: [{ size: payload.size, url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" }],
    },
  };
}

submitBtn.addEventListener("click", async () => {
  showError("");
  setLoading(true);

  try {
    const resp = await generateImage();
    const url = resp?.result?.images?.[0]?.url;
    if (!resp?.ok || !url) throw new Error("Не удалось получить результат.");
    renderResult(url);
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});

$("#regenTitle").addEventListener("click", () => showToast("Перегенерация заголовка: подключи логику"));
$("#regenSubtitle").addEventListener("click", () => showToast("Перегенерация подзаголовка: подключи логику"));
