const N8N_AI_URL = "https://YOUR.app.n8n.cloud/webhook/tg-form/ai";
const N8N_SUBMIT_URL = "https://YOUR.app.n8n.cloud/webhook/tg-form/submit";

const tg = window.Telegram?.WebApp;
tg?.ready();

const topic = document.getElementById("topic");
const title = document.getElementById("title");
const subtitle = document.getElementById("subtitle");

const regenTitle = document.getElementById("regenTitle");
const regenSubtitle = document.getElementById("regenSubtitle");
const submitBtn = document.getElementById("submitBtn");

const globalStatus = document.getElementById("globalStatus");

function getSizes() {
  return Array.from(document.querySelectorAll(".check input:checked"))
    .map(i => i.value);
}

function getDraft() {
  return {
    topic: topic.value.trim(),
    title: title.value.trim(),
    subtitle: subtitle.value.trim(),
    sizes: getSizes()
  };
}

async function regenerate(field) {
  globalStatus.textContent = "Генерация…";

  const res = await fetch(N8N_AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initData: tg?.initData || "",
      action: "regenerate",
      target_fields: [field],
      draft: getDraft()
    })
  });

  const json = await res.json();
  if (json?.fields?.[field]) {
    if (field === "title") title.value = json.fields[field];
    if (field === "subtitle") subtitle.value = json.fields[field];
    globalStatus.textContent = "Готово";
  } else {
    globalStatus.textContent = "Ошибка генерации";
  }
}

async function submit() {
  globalStatus.textContent = "Отправка…";

  const res = await fetch(N8N_SUBMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initData: tg?.initData || "",
      action: "submit",
      draft: getDraft()
    })
  });

  const json = await res.json();
  globalStatus.textContent = json.ok ? "Готово" : "Ошибка";
}

regenTitle.onclick = () => regenerate("title");
regenSubtitle.onclick = () => regenerate("subtitle");
submitBtn.onclick = submit;
