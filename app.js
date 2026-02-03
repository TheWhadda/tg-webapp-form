const $ = (sel) => document.querySelector(sel);

const topicEl = $("#topic");
const titleEl = $("#title");
const subtitleEl = $("#subtitle");

const submitBtn = $("#submit");
const errorBox = $("#error");

const resultCard = $("#resultCard");
const thumbEl = $("#thumb");
const resultUrlEl = $("#resultUrl");
const copyLinkBtn = $("#copyLink");
const openLinkBtn = $("#openLink");

const toastEl = $("#toast");

function getSelectedSize() {
  const checked = document.querySelector('input[name="size"]:checked');
  return checked ? checked.value : "600x600";
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

/**
 * Результат:
 * - заголовок без размера
 * - миниатюра
 * - клик по ссылке копирует
 * - "Открыть" открывает URL
 */
function renderResult(url) {
  resultCard.hidden = false;

  thumbEl.src = url;
  resultUrlEl.textContent = url;

  copyLinkBtn.onclick = async () => {
    const ok = await copyToClipboard(url);
    showToast(ok ? "Скопировано" : "Не удалось скопировать");
  };

  openLinkBtn.onclick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };
}

/**
 * Подключи здесь свой реальный endpoint.
 * Я оставил понятную заготовку.
 */
async function generateImage() {
  const payload = {
    topic: topicEl.value.trim(),
    title: titleEl.value.trim(),
    subtitle: subtitleEl.value.trim(),
    size: getSelectedSize(),
  };

  if (!payload.topic) throw new Error("Заполните поле «Тема».");
  if (!payload.title) throw new Error("Заполните поле «Заголовок».");
  if (!payload.subtitle) throw new Error("Заполните поле «Подзаголовок».");

  // TODO: заменить на твой реальный запрос
  // Пример:
  // const r = await fetch("https://YOUR_DOMAIN/webhook/...", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  // const resp = await r.json();
  // return resp;

  // Заглушка для проверки UI:
  return {
    ok: true,
    result: {
      images: [
        { size: payload.size, url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
      ],
    },
  };
}

submitBtn.addEventListener("click", async () => {
  showError("");
  setLoading(true);

  try {
    const resp = await generateImage();
    if (!resp || resp.ok !== true) {
      throw new Error(resp?.error || "Не удалось получить результат.");
    }

    const url = resp.result?.images?.[0]?.url;
    if (!url) throw new Error("В ответе нет url изображения.");

    renderResult(url);
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});

// Кнопки перегенерации — подключи к своей логике (если уже есть, просто замени обработчики)
$("#regenTitle").addEventListener("click", () => {
  showToast("Перегенерация заголовка: подключи логику");
});

$("#regenSubtitle").addEventListener("click", () => {
  showToast("Перегенерация подзаголовка: подключи логику");
});
