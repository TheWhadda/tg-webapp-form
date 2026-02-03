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
    // fallback
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
 * Рендер результата:
 * - заголовок без "600x600"
 * - миниатюра
 * - ссылка кликабельна и копирует URL
 * - кнопка "Открыть" открывает URL
 */
function renderResult(url) {
  resultCard.hidden = false;

  // миниатюра (как есть)
  thumbEl.src = url;

  // ссылка в тексте (коротко отображаем, копируем полный)
  resultUrlEl.textContent = url;

  // кнопки
  copyLinkBtn.onclick = async () => {
    const ok = await copyToClipboard(url);
    if (ok) showToast("Скопировано");
    else showToast("Не удалось скопировать");
  };

  openLinkBtn.onclick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };
}

/**
 * Тут подключи свой реальный API.
 * Сейчас — заглушка, чтобы было понятно, куда вставлять.
 */
async function generateImage() {
  const payload = {
    topic: topicEl.value.trim(),
    title: titleEl.value.trim(),
    subtitle: subtitleEl.value.trim(),
    size: getSelectedSize()
  };

  if (!payload.topic) throw new Error("Заполните поле «Тема».");
  if (!payload.title) throw new Error("Заполните поле «Заголовок».");
  if (!payload.subtitle) throw new Error("Заполните поле «Подзаголовок».");

  // --- ВАЖНО: заменить на реальный вызов ---
  // Пример ожидаемого ответа:
  // { ok: true, result: { images: [{ size: "600x600", url: "https://..." }] } }

  // return fetch("YOUR_ENDPOINT", { method:"POST", headers:{...}, body: JSON.stringify(payload) }).then(r=>r.json());

  // Заглушка:
  return {
    ok: true,
    result: {
      images: [
        { size: payload.size, url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" }
      ]
    }
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

    // Берём первую картинку (теперь размер один, radio)
    const url = resp.result?.images?.[0]?.url;
    if (!url) throw new Error("В ответе нет url изображения.");

    renderResult(url);
  } catch (e) {
    showError(e?.message || "Ошибка");
  } finally {
    setLoading(false);
  }
});

// Кнопки перегенерации (пока заглушки — подключишь к своей логике)
$("#regenTitle").addEventListener("click", () => {
  // сюда твой генератор заголовка
  showToast("Перегенерация заголовка (подключи логику)");
});

$("#regenSubtitle").addEventListener("click", () => {
  // сюда твой генератор подзаголовка
  showToast("Перегенерация подзаголовка (подключи логику)");
});
