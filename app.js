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

// output block (у тебя он уже есть в index.html)
const outputSection = document.getElementById("output");
const resultsEl = document.getElementById("results");

/* ================= helpers ================= */

function getSizes() {
  return Array.from(document.querySelectorAll(".check input:checked")).map((i) => i.value);
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

function clearResults() {
  if (resultsEl) resultsEl.innerHTML = "";
  if (outputSection) outputSection.hidden = true;
}

function showResults(images = []) {
  if (!resultsEl || !outputSection) return;

  resultsEl.innerHTML = "";
  outputSection.hidden = false;

  // карточки ссылок/превью
  for (const img of images) {
    const size = img?.size || "";
    const url = img?.url || "";
    if (!url) continue;

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";
    row.style.padding = "10px 12px";
    row.style.border = "1px solid rgba(255,255,255,0.12)";
    row.style.borderRadius = "14px";
    row.style.background = "rgba(255,255,255,0.04)";
    row.style.marginTop = "8px";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.gap = "4px";

    const title = document.createElement("div");
    title.style.fontSize = "13px";
    title.style.color = "rgba(255,255,255,0.9)";
    title.textContent = size ? `Изображение ${size}` : "Изображение";

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.style.fontSize = "12px";
    link.style.color = "rgba(186,154,241,0.95)";
    link.style.wordBreak = "break-all";
    link.textContent = url;

    left.appendChild(title);
    left.appendChild(link);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Открыть";
    btn.style.background = "rgba(145,93,230,0.18)";
    btn.style.border = "1px solid rgba(145,93,230,0.35)";
    btn.style.color = "#fff";
    btn.style.borderRadius = "12px";
    btn.style.padding = "10px 12px";
    btn.style.cursor = "pointer";
    btn.onclick = () => window.open(url, "_blank", "noreferrer");

    row.appendChild(left);
    row.appendChild(btn);

    resultsEl.appendChild(row);
  }
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

    if (!res.ok) return { ok: false, error: json?.error || `HTTP ${res.status}`, details: json };
    return json;
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, error: "timeout" };
    return { ok: false, error: e?.message || "network error" };
  } finally {
    clearTimeout(t);
  }
}

/* ================= generation ================= */

async function regenerate(field, { silent = false } = {}) {
  if (!topic.value.trim()) return false;

  const btn = field === "title" ? regenTitle : regenSubtitle;
  setBusy(btn, true);
  if (!silent) setStatus("Генерация…", "info");

  const payload = {
    initData: tg?.initData || "",
    action: "regenerate",
    target_fields: [field],
    draft: getDraft(),
  };

  const json = await postJSON(AI_URL, payload, { timeoutMs: 20000 });

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

let topicAutoTriggered = false;

topic.addEventListener("blur", async () => {
  const value = topic.value.trim();
  if (!value) return;
  if (topicAutoTriggered) return;
  if (title.value.trim() && subtitle.value.trim()) return;

  topicAutoTriggered = true;
  setStatus("Генерация заголовка…", "info");

  if (!title.value.trim()) {
    const okTitle = await regenerate("title", { silent: true });
    if (!okTitle) {
      setStatus("Ошибка генерации заголовка", "err");
      return;
    }
  }

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
  clearResults();

  if (!topic.value.trim()) {
    setStatus("Ошибка: заполни тему", "err");
    topic.focus();
    return;
  }

  const sizes = getSizes();
  if (sizes.length === 0) {
    setStatus("Ошибка: выбери размер", "err");
    return;
  }

  setAllBusy(true);
  setStatus("Вжух…", "info");

  const payload = {
    initData: tg?.initData || "",
    action: "submit",
    draft: getDraft(),
  };

  const json = await postJSON(SUBMIT_URL, payload, { timeoutMs: 60000 });

  if (json?.ok) {
    setStatus("Готово ✓", "ok");

    const images = json?.result?.images;
    if (Array.isArray(images) && images.length > 0) {
      showResults(images);
    }
  } else {
    setStatus(`Ошибка: ${json?.error || "unknown"}`, "err");
  }

  setAllBusy(false);
}

/* ================= bindings ================= */

regenTitle.onclick = () => regenerate("title");
regenSubtitle.onclick = () => regenerate("subtitle");
submitBtn.onclick = submit;
