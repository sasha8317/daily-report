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

  if ($("checkTrialText")) {
    const ok = actualTrial >= targetTrial && targetTrial > 0 ? true : (targetTrial === 0 ? true : actualTrial >= targetTrial);
    $("checkTrialText").innerHTML = `${actualTrial} / ${targetTrial} ${badgeText(ok)}`;
  }

  if ($("checkCallText")) {
    const ok = actualCall >= targetCall && targetCall > 0 ? true : (targetCall === 0 ? true : actualCall >= targetCall);
    $("checkCallText").innerHTML = `${actualCall} / ${targetCall} ${badgeText(ok)}`;
  }

  if ($("checkInviteText")) {
    const ok = actualInvite >= targetInvite && targetInvite > 0 ? true : (targetInvite === 0 ? true : actualInvite >= targetInvite);
    $("checkInviteText").innerHTML = `${actualInvite} / ${targetInvite} ${badgeText(ok)}`;
  }

  // 邀約成功率：invite / call
  const rate = actualCall > 0 ? (actualInvite / actualCall) : 0;
  const pct = (rate * 100).toFixed(0) + "%";
  if ($("checkInviteRateText")) $("checkInviteRateText").textContent = pct;

  const badge = $("checkInviteRateBadge");
  if (badge) {
    badge.style.display = "inline-block";
    badge.classList.remove("green", "yellow", "red");

    // 你可以自行調門檻：>=30% 綠、>=15% 黃、其他紅
    if (rate >= 0.30) { badge.classList.add("green"); badge.textContent = "高"; }
    else if (rate >= 0.15) { badge.classList.add("yellow"); badge.textContent = "中"; }
    else { badge.classList.add("red"); badge.textContent = "低"; }
  }
}

// ===== 產生訊息（含達成/未達成段落） =====
function generateMessage() {
  saveToday(); // 先存起來，避免漏

  const d = collectForm();
  const date = d.date;
  const title = `${date}｜${d.store || "-"} ${d.name || ""}`.trim();

  const msg = [
    title,
    `1. 今日外撥：${d.todayCallTotal} 通（潛在 ${d.todayCallPotential} 通、過保舊客 ${d.todayCallOld3Y} 通）`,
    `2. 今日預約：${d.todayBookingTotal} 位`,
    `3. 今日到店：${d.todayVisitTotal} 位`,
    `   試用：HA ${d.trialHA} 位、APAP ${d.trialAPAP} 位`,
    `   成交：HA ${d.dealHA} 位、APAP ${d.dealAPAP} 位`,
    `4. 明日已排預約：${d.tomorrowBookingTotal} 位`,
    `5. 明日KPI:`,
    `   外撥 ${d.tomorrowKpiCallTotal} 通`,
    `   舊客預約 ${d.tomorrowKpiCallOld3Y} 位`,
    `   完成試戴 ${d.tomorrowKpiTrial} 位`,
    ``,
    `【昨日執行檢視（達成/未達成）】`,
    buildYesterdayCheckText(date),
  ].join("\n");

  if ($("output")) $("output").value = msg;
}
window.generateMessage = generateMessage;

function buildYesterdayCheckText(todayStr) {
  const yesterday = addDaysToDateStr(todayStr, -1);
  const dayBeforeYesterday = addDaysToDateStr(todayStr, -2);

  const yd = loadByDate(yesterday);           // 昨天實績
  const dby = loadByDate(dayBeforeYesterday); // 前天設定（= 昨天目標）

  if (!yd || !dby) {
    return "（找不到昨日實績或前日KPI資料，請確認前天有填寫「明日KPI」，且昨天有填寫回報。）";
  }

  const targetTrial = n(dby.tomorrowKpiTrial);
  const targetCall = n(dby.tomorrowKpiCallTotal);
  const targetInvite = n(dby.tomorrowKpiCallOld3Y);

  const actualTrial = n(yd.trialHA) + n(yd.trialAPAP);
  const actualCall = n(yd.todayCallPotential) + n(yd.todayCallOld3Y);
  const actualInvite = n(yd.todayInviteReturn);

  const okTrial = actualTrial >= targetTrial;
  const okCall = actualCall >= targetCall;
  const okInvite = actualInvite >= targetInvite;

  const rate = actualCall > 0 ? (actualInvite / actualCall) : 0;
  const pct = (rate * 100).toFixed(0) + "%";

  return [
    `- 試戴：${actualTrial} / ${targetTrial}（${okTrial ? "達成" : "未達成"}）`,
    `- 外撥：${actualCall} / ${targetCall}（${okCall ? "達成" : "未達成"}）`,
    `- 邀約回店：${actualInvite} / ${targetInvite}（${okInvite ? "達成" : "未達成"}）`,
    `- 邀約成功率：${pct}`,
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
