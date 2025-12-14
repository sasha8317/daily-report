console.log("✅ test app.js loaded");

// ✅ 測試版儲存前綴（不要動，避免污染正式版）
const STORAGE_PREFIX = "daily-report-test-";

// ===== 日期工具 =====
function getCurrentDateStr() {
  const input = document.getElementById("date");
  let value = input && input.value;
  if (!value) {
    const d = new Date();
    const m = ("0" + (d.getMonth() + 1)).slice(-2);
    const day = ("0" + d.getDate()).slice(-2);
    value = `${d.getFullYear()}-${m}-${day}`;
    if (input) input.value = value;
  }
  return value;
}

function addDaysToDateStr(dateStr, delta) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const mm = ("0" + (dt.getMonth() + 1)).slice(-2);
  const dd = ("0" + dt.getDate()).slice(-2);
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function storageKey(dateStr) {
  return `${STORAGE_PREFIX}${dateStr}`;
}

function n(v) {
  const x = Number(String(v ?? "").trim());
  return Number.isFinite(x) ? x : 0;
}

function $(id) {
  return document.getElementById(id);
}

// ===== 讀表單 =====
function collectForm() {
  const date = getCurrentDateStr();

  const obj = {
    date,
    store: $("store")?.value?.trim() || "",
    name: $("name")?.value?.trim() || "",

    // 今日外撥
    todayCallPotential: n($("todayCallPotential")?.value),
    todayCallOld3Y: n($("todayCallOld3Y")?.value),
    todayCallTotal: n($("todayCallTotal")?.value),
    todayInviteReturn: n($("todayInviteReturn")?.value),

    // 今日預約/到店
    todayBookingTotal: n($("todayBookingTotal")?.value),
    todayVisitTotal: n($("todayVisitTotal")?.value),

    // 試用/成交
    trialHA: n($("trialHA")?.value),
    trialAPAP: n($("trialAPAP")?.value),
    dealHA: n($("dealHA")?.value),
    dealAPAP: n($("dealAPAP")?.value),

    // 明日
    tomorrowBookingTotal: n($("tomorrowBookingTotal")?.value),
    tomorrowKpiCallTotal: n($("tomorrowKpiCallTotal")?.value),
    tomorrowKpiCallOld3Y: n($("tomorrowKpiCallOld3Y")?.value),
    tomorrowKpiTrial: n($("tomorrowKpiTrial")?.value),

    updatedAt: new Date().toISOString(),
  };

  // 保險：總通數重新算一次
  obj.todayCallTotal = obj.todayCallPotential + obj.todayCallOld3Y;

  return obj;
}

// ===== 寫回表單 =====
function fillForm(data) {
  if (!data) return;

  if ($("store")) $("store").value = data.store ?? "";
  if ($("name")) $("name").value = data.name ?? "";

  if ($("todayCallPotential")) $("todayCallPotential").value = data.todayCallPotential ?? "";
  if ($("todayCallOld3Y")) $("todayCallOld3Y").value = data.todayCallOld3Y ?? "";
  recalcTotals();

  if ($("todayInviteReturn")) $("todayInviteReturn").value = data.todayInviteReturn ?? "";

  if ($("todayBookingTotal")) $("todayBookingTotal").value = data.todayBookingTotal ?? "";
  if ($("todayVisitTotal")) $("todayVisitTotal").value = data.todayVisitTotal ?? "";

  if ($("trialHA")) $("trialHA").value = data.trialHA ?? "";
  if ($("trialAPAP")) $("trialAPAP").value = data.trialAPAP ?? "";
  if ($("dealHA")) $("dealHA").value = data.dealHA ?? "";
  if ($("dealAPAP")) $("dealAPAP").value = data.dealAPAP ?? "";

  if ($("tomorrowBookingTotal")) $("tomorrowBookingTotal").value = data.tomorrowBookingTotal ?? "";
  if ($("tomorrowKpiCallTotal")) $("tomorrowKpiCallTotal").value = data.tomorrowKpiCallTotal ?? "";
  if ($("tomorrowKpiCallOld3Y")) $("tomorrowKpiCallOld3Y").value = data.tomorrowKpiCallOld3Y ?? "";
  if ($("tomorrowKpiTrial")) $("tomorrowKpiTrial").value = data.tomorrowKpiTrial ?? "";
}

// ===== 儲存/讀取 =====
function saveToday() {
  const date = getCurrentDateStr();
  const payload = collectForm();
  localStorage.setItem(storageKey(date), JSON.stringify(payload));
}

function loadByDate(dateStr) {
  const raw = localStorage.getItem(storageKey(dateStr));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ===== 計算外撥總通數 =====
function recalcTotals() {
  const p = n($("todayCallPotential")?.value);
  const o = n($("todayCallOld3Y")?.value);
  if ($("todayCallTotal")) $("todayCallTotal").value = p + o;
  saveToday();
}
window.recalcTotals = recalcTotals;

// ===== 分頁切換 =====
function showView(view) {
  const huddleBtn = $("tab-huddle");
  const reportBtn = $("tab-report");
  const huddleView = $("huddle-view");
  const reportView = $("report-view");

  if (!huddleBtn || !reportBtn || !huddleView || !reportView) return;

  const isHuddle = view === "huddle";
  huddleView.classList.toggle("hidden", !isHuddle);
  reportView.classList.toggle("hidden", isHuddle);

  huddleBtn.classList.toggle("active", isHuddle);
  reportBtn.classList.toggle("active", !isHuddle);

  // 進入今日檢視時，刷新顯示
  if (isHuddle) renderHuddle();
}

// ===== 今日檢視（自動帶入 + 昨日執行檢視 + 達成/未達成） =====
function badgeText(ok) {
  return ok ? `<span class="badge green">達成</span>` : `<span class="badge red">未達成</span>`;
}

function renderHuddle() {
  const today = getCurrentDateStr();
  const yesterday = addDaysToDateStr(today, -1);
  const dayBeforeYesterday = addDaysToDateStr(today, -2);

  const yData = loadByDate(yesterday);           // 昨天填的「明日目標」= 今天目標
  const ydData = loadByDate(yesterday);          // 昨天的實績（用於「昨日執行檢視」）
  const dbyData = loadByDate(dayBeforeYesterday); // 前天填的「明日KPI」= 昨天目標

  // A) 今日目標：取昨天的「明日已排預約 / 明日KPI」
  if ($("huddleTodayBooking")) $("huddleTodayBooking").textContent = yData?.tomorrowBookingTotal ?? "-";
  if ($("huddleTodayTrial")) $("huddleTodayTrial").textContent = yData?.tomorrowKpiTrial ?? "-";
  if ($("huddleTodayCallTotal")) $("huddleTodayCallTotal").textContent = yData?.tomorrowKpiCallTotal ?? "-";
  if ($("huddleTodayOld3Y")) $("huddleTodayOld3Y").textContent = yData?.tomorrowKpiCallOld3Y ?? "-";

  // 也順便提示＆（可選）自動帶入今日預約
  const hintBox = $("todayBookingHint");
  const hintVal = $("todayBookingHintValue");
  if (hintBox && hintVal && yData && Number.isFinite(Number(yData.tomorrowBookingTotal))) {
    hintVal.textContent = yData.tomorrowBookingTotal;
    hintBox.style.display = "block";

    // 若今日預約空白，就自動帶入
    if ($("todayBookingTotal") && String($("todayBookingTotal").value || "").trim() === "") {
      $("todayBookingTotal").value = yData.tomorrowBookingTotal;
      saveToday();
    }
  } else if (hintBox) {
    hintBox.style.display = "none";
  }

  // B) 昨日執行檢視：用「前天設定的KPI」對照「昨天回報實績」
  const targetTrial = n(dbyData?.tomorrowKpiTrial);
  const targetCall = n(dbyData?.tomorrowKpiCallTotal);
  const targetInvite = n(dbyData?.tomorrowKpiCallOld3Y);

  const actualTrial = n(ydData?.trialHA) + n(ydData?.trialAPAP);
  const actualCall = n(ydData?.todayCallPotential) + n(ydData?.todayCallOld3Y);
  const actualInvite = n(ydData?.todayInviteReturn);

  function statusText(ok) {
    return ok ? `✔ 達成` : `✘ 未達成`;
  }

  // 試戴數
  if ($("checkTrialText")) {
    const ok = actualTrial >= targetTrial;
    $("checkTrialText").textContent = `目標 ${targetTrial} / 執行 ${actualTrial}  ${statusText(ok)}`;
  }

  // 外撥通數
  if ($("checkCallText")) {
    const ok = actualCall >= targetCall;
    $("checkCallText").textContent = `目標 ${targetCall} / 執行 ${actualCall}  ${statusText(ok)}`;
  }

  // 邀約回店數
  if ($("checkInviteText")) {
    const ok = actualInvite >= targetInvite;
    $("checkInviteText").textContent = `目標 ${targetInvite} / 執行 ${actualInvite}  ${statusText(ok)}`;
  }

  // 邀約成功率：invite / call（維持你原本右側 badge 的設計）
  const rate = actualCall > 0 ? (actualInvite / actualCall) : 0;
  const pct = (rate * 100).toFixed(0) + "%";
  if ($("checkInviteRateText")) $("checkInviteRateText").textContent = pct;

  const badge = $("checkInviteRateBadge");
  if (badge) {
    badge.style.display = "inline-block";
    badge.classList.remove("green", "yellow", "red");

    // 你截圖是「20% 高」這種感覺：我做成 3 段文字（高 / 中 / 低）
    if (rate >= 0.30) { badge.classList.add("green"); badge.textContent = "高"; }
    else if (rate >= 0.15) { badge.classList.add("yellow"); badge.textContent = "中"; }
    else { badge.classList.add("red"); badge.textContent = "低"; }
  }
}

// ===== 產生訊息（含達成/未達成段落） =====
function generateMessage() {
  saveToday(); // 先存，避免漏資料

  const d = collectForm();

  const title = `${d.date}｜${d.store || ""} ${d.name || ""}`.trim();

  const msg =
`${title}
1. 今日外撥：${d.todayCallTotal} 通（潛客 ${d.todayCallPotential} 通、過保舊客 ${d.todayCallOld3Y} 通）
2. 今日預約：${d.todayBookingTotal} 位
3. 今日到店：${d.todayVisitTotal} 位
   試用：HA ${d.trialHA} 位、APAP ${d.trialAPAP} 位
   成交：HA ${d.dealHA} 位、APAP ${d.dealAPAP} 位
4. 明日已排預約：${d.tomorrowBookingTotal} 位
5. 明日KPI：
   完成試戴 ${d.tomorrowKpiTrial} 位
   外撥 ${d.tomorrowKpiCallTotal} 通
   舊客預約 ${d.tomorrowKpiCallOld3Y} 位

📊 今日執行檢視（對照昨日 KPI）
${buildYesterdayCheckText(d.date)}
`;

  if ($("output")) $("output").value = msg;
}
window.generateMessage = generateMessage;

function buildYesterdayCheckText(todayStr) {
  const yesterday = addDaysToDateStr(todayStr, -1);
  const dayBeforeYesterday = addDaysToDateStr(todayStr, -2);

  // 昨天實績
  const yd = loadByDate(yesterday);
  // 前天設定的「明日KPI」= 昨天的 KPI
  const dby = loadByDate(dayBeforeYesterday);

  if (!yd || !dby) {
    return "•（找不到昨日實績或前日 KPI，請確認前天有填「明日KPI」，且昨天有填回報）";
  }

  // KPI 目標（取前天的明日KPI）
  const targetTrial = n(dby.tomorrowKpiTrial);
  const targetCall  = n(dby.tomorrowKpiCallTotal);
  const targetInvite = n(dby.tomorrowKpiCallOld3Y);

  // 昨天實績（取昨天回報）
  const actualTrial = n(yd.trialHA) + n(yd.trialAPAP);
  const actualCall  = n(yd.todayCallPotential) + n(yd.todayCallOld3Y); // 或 yd.todayCallTotal 也行
  const actualInvite = n(yd.todayInviteReturn);

  const okText = (ok) => (ok ? "✓ 達成" : "✘ 未達成");

  // 邀約成功率
  const rate = actualCall > 0 ? (actualInvite / actualCall) : 0;
  const pct = Math.round(rate * 100) + "%";

  return [
    `• 試戴數：目標 ${targetTrial} / 執行 ${actualTrial}   ${okText(actualTrial >= targetTrial)}`,
    `• 外撥通數：目標 ${targetCall} / 執行 ${actualCall}   ${okText(actualCall >= targetCall)}`,
    `• 邀約回店數：目標 ${targetInvite} / 執行 ${actualInvite}   ${okText(actualInvite >= targetInvite)}`,
    `• 邀約成功率：${pct}`,
  ].join("\n");
}


// ===== 複製 =====
async function copyMessage() {
  const text = $("output")?.value || "";
  if (!text.trim()) return;

  try {
    await navigator.clipboard.writeText(text);
    alert("✅ 已複製到剪貼簿");
  } catch {
    // fallback
    const ta = $("output");
    if (ta) {
      ta.focus();
      ta.select();
      document.execCommand("copy");
      alert("✅ 已複製到剪貼簿");
    }
  }
}
window.copyMessage = copyMessage;

// ===== 初始化 =====
function bindAutoSave() {
  const ids = [
    "store","name",
    "todayCallPotential","todayCallOld3Y","todayInviteReturn",
    "todayBookingTotal","todayVisitTotal",
    "trialHA","trialAPAP","dealHA","dealAPAP",
    "tomorrowBookingTotal","tomorrowKpiCallTotal","tomorrowKpiCallOld3Y","tomorrowKpiTrial",
  ];
  ids.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", saveToday);
    el.addEventListener("change", saveToday);
  });
}

function initTabs() {
  const h = $("tab-huddle");
  const r = $("tab-report");
  if (h) h.addEventListener("click", () => showView("huddle"));
  if (r) r.addEventListener("click", () => showView("report"));
}

function initDateLoad() {
  const dateInput = $("date");
  if (!dateInput) return;

  // 初始日期
  const today = getCurrentDateStr();

  // 載入今天資料（如果有）
  const data = loadByDate(today);
  if (data) fillForm(data);
  recalcTotals();

  dateInput.addEventListener("change", () => {
    const ds = getCurrentDateStr();
    const d = loadByDate(ds);
    // 清空再填（避免殘留）
    document.querySelectorAll("input[type='number'], input[type='text'], select").forEach(el => {
      if (el.id === "date") return;
      if (el.tagName === "SELECT") el.value = "";
      else el.value = "";
    });
    if (d) fillForm(d);
    recalcTotals();
    renderHuddle();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  bindAutoSave();
  initDateLoad();
  renderHuddle();
});
