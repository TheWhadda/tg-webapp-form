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

const outputSection = document.getElementById("output");
const resultsEl = document.getElementById("results");

/* ================= helpers ================= */

function getSizes() {
  return Array.from(document.querySelectorAll(".check input:checked")).map(i => i.value);
}

function getDraft() {
  return {
    topic: topic.value.trim(),
    title: title.value.trim(),
    subtitle: subtitle.value.trim(),
    sizes: getSizes(),
  };
}

function setError(text) {
  globalStatus.textContent = text || "";
  globalStatus.dataset.type = text ? "err" : "";
}

function clearStatus() {
  globalStatus.textContent = "";
  globalStatus.dataset.type = "";
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

  for (const img of images) {
    if (!img?.url) continue;

    const row = document.createElement("div");
    row.className = "resultRow";

    const info = document.createElement("div");
    info.className = "resultInfo";

    const t = document.createElement("div");
    t.className = "resultTitle";
    t.textContent = img.size ? `Изображение ${img.size}` : "Изображение";

    const link = document.createElement("a");
    link.href = img.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = img.url;

    info.appendChild(t);
    info.appendChild(link);

    const btn = document.createElement("button");
    btn.className = "resultBtn";
    btn.textContent = "Открыть";
    btn.onclick = () => window.open(img.url, "_blank", "noreferrer");

    row.appendChild(info);
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
    try { json = JSON.parse(text); } catch { json = { ok: false }; }

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch (e) {
    return { ok: false, error: "network error" };
  } finally {
    clearTimeout(t);
  }
}

/* ================= generation ================= */

async function regenerate(field) {
  if (!topic.value.trim()) return;

  clearStatus();
  const btn = field === "title" ? regenTitle : regenSubtitle;
  setBusy(btn, true);

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
  } else {
    setError("Ошибка генерации");
  }

  setBusy(btn, false);
}

/* ================= auto flow ================= */

let topicAutoTriggered = false;

topic.addEventListener("blur", async () => {
  if (!topic.value.trim()) return;
  if (topicAutoTriggered) return;
  if (title.value.trim() && subtitle.value.trim()) return;

  topicAutoTriggered = true;
  clearStatus();

  if (!title.value.trim()) await regenerate("title");
  if (!subtitle.value.trim()) await regenerate("subtitle");
});

/* ================= submit ================= */

async function submit() {
  clearStatus();
  clearResults();

  if (!topic.value.trim()) {
    setError("Заполни тему");
    return;
  }

  if (getSizes().length === 0) {
    setError("Выбери размер");
    return;
  }

  setAllBusy(true);

  const payload = {
    initData: tg?.initData || "",
    action: "submit",
    draft: getDraft(),
  };

  const json = await postJSON(SUBMIT_URL, payload, { timeoutMs: 60000 });

  if (json?.ok) {
    const images = json?.result?.images;
    if (Array.isArray(images)) showResults(images);
  } else {
    setError("Ошибка генерации");
  }

  setAllBusy(false);
}

/* ================= bindings ================= */

regenTitle.onclick = () => regenerate("title");
regenSubtitle.onclick = () => regenerate("subtitle");
submitBtn.onclick = submit;
