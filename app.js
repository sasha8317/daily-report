console.log("✅ official app.js loaded");

// ✅ 正式版儲存前綴（避免跟測試版混在一起）
const STORAGE_PREFIX = "daily-report-";

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

// ✅ 關鍵修正：空白就回傳空白，不再強制變 0
function n(v) {
  if (v === "" || v === null || v === undefined) return "";
  const x = Number(String(v).trim());
  return Number.isFinite(x) ? x : "";
}

function $(id) {
  return document.getElementById(id);
}

// ✅ 符號＋文字統一
function okText(ok) {
  return ok ? "✔️ 達成" : "✖️ 未達成";
}

// ===== 儲存 / 讀取 =====
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

function hasDataOnDate(dateStr) {
  return localStorage.getItem(storageKey(dateStr)) != null;
}

// 從某天往回找最近一次有資料（跳過休假日）
function findPrevDateWithData(fromDateStr, maxLookbackDays = 60) {
  let cursor = addDaysToDateStr(fromDateStr, -1);
  for (let i = 0; i < maxLookbackDays; i++) {
    if (hasDataOnDate(cursor)) return cursor;
    cursor = addDaysToDateStr(cursor, -1);
  }
  return null;
}

// 取得最近兩次有資料日：d1=上一次、d0=上上一次
function getPrevTwoDataDates(todayStr) {
  const d1 = findPrevDateWithData(todayStr);
  if (!d1) return { d1: null, d0: null };
  const d0 = findPrevDateWithData(d1);
  return { d1, d0 };
}

// 取得「昨日KPI來源日」
function getKpiSourceDateForToday(todayStr) {
  const yesterday = addDaysToDateStr(todayStr, -1);
  if (hasDataOnDate(yesterday)) return yesterday;
  return findPrevDateWithData(todayStr);
}

// ===== 讀表單 =====
function collectForm() {
  const date = getCurrentDateStr();

  const obj = {
    date,
    store: $("store")?.value?.trim() || "",
    name: $("name")?.value?.trim() || "",

    todayCallPotential: n($("todayCallPotential")?.value),
    todayCallOld3Y: n($("todayCallOld3Y")?.value),
    todayInviteReturn: n($("todayInviteReturn")?.value),

    todayBookingTotal: n($("todayBookingTotal")?.value),
    todayVisitTotal: n($("todayVisitTotal")?.value),

    trialHA: n($("trialHA")?.value),
    trialAPAP: n($("trialAPAP")?.value),
    dealHA: n($("dealHA")?.value),
    dealAPAP: n($("dealAPAP")?.value),

    tomorrowBookingTotal: n($("tomorrowBookingTotal")?.value),
    tomorrowKpiCallTotal: n($("tomorrowKpiCallTotal")?.value),
    tomorrowKpiCallOld3Y: n($("tomorrowKpiCallOld3Y")?.value),
    tomorrowKpiTrial: n($("tomorrowKpiTrial")?.value),

    updatedAt: new Date().toISOString(),
  };

  // 保險：總通數重新算一次（只用來產生訊息與計算）
  obj.todayCallTotal =
    (Number(obj.todayCallPotential) || 0) +
    (Number(obj.todayCallOld3Y) || 0);

  return obj;
}

// ===== 寫回表單（0 不回填畫面）=====
function fillForm(data) {
  if (!data) return;

  Object.entries(data).forEach(([k, v]) => {
    const el = $(k);
    if (!el) return;
    el.value = v === 0 ? "" : (v ?? "");
  });

  recalcTotals();
}

// ===== 計算外撥總通數（避免顯示 0）=====
function recalcTotals() {
  const pRaw = $("todayCallPotential")?.value;
  const oRaw = $("todayCallOld3Y")?.value;
  const totalEl = $("todayCallTotal");

  if (!totalEl) return;

  if ((pRaw === "" || pRaw == null) && (oRaw === "" || oRaw == null)) {
    totalEl.value = "";
  } else {
    totalEl.value = (Number(pRaw) || 0) + (Number(oRaw) || 0);
  }

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

  if (isHuddle) renderHuddle();
}

// ===== 今日檢視（Morning Huddle）=====
function renderHuddle() {
  const today = getCurrentDateStr();
  const { d1, d0 } = getPrevTwoDataDates(today);

  const prevData = d1 ? loadByDate(d1) : null;

  if ($("huddleTodayBooking")) $("huddleTodayBooking").textContent = prevData?.tomorrowBookingTotal ?? "-";
  if ($("huddleTodayTrial")) $("huddleTodayTrial").textContent = prevData?.tomorrowKpiTrial ?? "-";
  if ($("huddleTodayCallTotal")) $("huddleTodayCallTotal").textContent = prevData?.tomorrowKpiCallTotal ?? "-";
  if ($("huddleTodayOld3Y")) $("huddleTodayOld3Y").textContent = prevData?.tomorrowKpiCallOld3Y ?? "-";

  const execData = d1 ? loadByDate(d1) : null;
  const kpiSetData = d0 ? loadByDate(d0) : null;

  if (!execData || !kpiSetData) return;

  const targetTrial = Number(kpiSetData.tomorrowKpiTrial) || 0;
  const targetCall = Number(kpiSetData.tomorrowKpiCallTotal) || 0;
  const targetInvite = Number(kpiSetData.tomorrowKpiCallOld3Y) || 0;

  const actualTrial =
    (Number(execData.trialHA) || 0) +
    (Number(execData.trialAPAP) || 0);
  const actualCall =
    (Number(execData.todayCallPotential) || 0) +
    (Number(execData.todayCallOld3Y) || 0);
  const actualInvite = Number(execData.todayInviteReturn) || 0;

  if ($("checkTrialText"))
    $("checkTrialText").textContent = `目標 ${targetTrial} / 執行 ${actualTrial}  ${okText(actualTrial >= targetTrial)}`;
  if ($("checkCallText"))
    $("checkCallText").textContent = `目標 ${targetCall} / 執行 ${actualCall}  ${okText(actualCall >= targetCall)}`;
  if ($("checkInviteText"))
    $("checkInviteText").textContent = `目標 ${targetInvite} / 執行 ${actualInvite}  ${okText(actualInvite >= targetInvite)}`;

  const rate = actualCall > 0 ? actualInvite / actualCall : 0;
  const pct = Math.round(rate * 100) + "%";

  if ($("checkInviteRateText")) $("checkInviteRateText").textContent = pct;
}

// ===== 產生訊息 =====
function generateMessage() {
  saveToday();

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
`;

  if ($("output")) $("output").value = msg;
}
window.generateMessage = generateMessage;

// ===== 複製 =====
async function copyMessage() {
  const text = $("output")?.value || "";
  if (!text.trim()) return;

  try {
    await navigator.clipboard.writeText(text);
    alert("✅ 已複製到剪貼簿");
  } catch {
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

  const today = getCurrentDateStr();

  const data = loadByDate(today);
  if (data) fillForm(data);
  recalcTotals();

  dateInput.addEventListener("change", () => {
    const ds = getCurrentDateStr();

    document.querySelectorAll("input[type='number'], input[type='text'], select").forEach(el => {
      if (el.id === "date") return;
      if (el.tagName === "SELECT") el.value = "";
      else el.value = "";
    });

    const d = loadByDate(ds);
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