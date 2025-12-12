console.log("✅ official app.js loaded");

// 🔒 正式版專用儲存前綴（與 test 完全隔離）
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
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const mm = ("0" + (dt.getMonth() + 1)).slice(-2);
  const dd = ("0" + dt.getDate()).slice(-2);
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

// ===== localStorage =====
function getStorageKey(dateStr) {
  return STORAGE_PREFIX + dateStr;
}

function loadReport(dateStr) {
  try {
    const raw = localStorage.getItem(getStorageKey(dateStr));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveReport(dateStr, data) {
  localStorage.setItem(getStorageKey(dateStr), JSON.stringify(data));
}

// ===== 表單工具 =====
function getNum(id) {
  const el = document.getElementById(id);
  return parseInt((el && el.value) || 0);
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null || value === "") return;
  el.value = value;
}

// ===== 套回資料 =====
function applyDataToForm(data) {
  if (!data) return;

  setInputValue("store", data.store);
  setInputValue("name", data.name);

  setInputValue("todayCallPotential", data.todayCallPotential);
  setInputValue("todayCallOld3Y", data.todayCallOld3Y);
  setInputValue("todayCallTotal", data.todayCallTotal);
  setInputValue("todayInviteReturn", data.todayInviteReturn);
  setInputValue("todayBookingTotal", data.todayBookingTotal);
  setInputValue("todayVisitTotal", data.todayVisitTotal);
  setInputValue("trialHA", data.trialHA);
  setInputValue("trialAPAP", data.trialAPAP);
  setInputValue("dealHA", data.dealHA);
  setInputValue("dealAPAP", data.dealAPAP);

  setInputValue("tomorrowBookingTotal", data.tomorrowBookingTotal);
  setInputValue("tomorrowKpiCallTotal", data.tomorrowKpiCallTotal);
  setInputValue("tomorrowKpiCallOld3Y", data.tomorrowKpiCallOld3Y);
  setInputValue("tomorrowKpiTrial", data.tomorrowKpiTrial);
}

// ===== 蒐集今日資料 =====
function collectTodayFormData() {
  return {
    date: getCurrentDateStr(),
    store: document.getElementById("store")?.value || "",
    name: document.getElementById("name")?.value || "",

    todayCallPotential: getNum("todayCallPotential"),
    todayCallOld3Y: getNum("todayCallOld3Y"),
    todayCallTotal: getNum("todayCallTotal"),
    todayInviteReturn: getNum("todayInviteReturn"),
    todayBookingTotal: getNum("todayBookingTotal"),
    todayVisitTotal: getNum("todayVisitTotal"),
    trialHA: getNum("trialHA"),
    trialAPAP: getNum("trialAPAP"),
    dealHA: getNum("dealHA"),
    dealAPAP: getNum("dealAPAP"),

    tomorrowBookingTotal: getNum("tomorrowBookingTotal"),
    tomorrowKpiCallTotal: getNum("tomorrowKpiCallTotal"),
    tomorrowKpiCallOld3Y: getNum("tomorrowKpiCallOld3Y"),
    tomorrowKpiTrial: getNum("tomorrowKpiTrial")
  };
}

// ===== 計算外撥總數 =====
function recalcTotals() {
  const total = getNum("todayCallPotential") + getNum("todayCallOld3Y");
  const el = document.getElementById("todayCallTotal");
  if (el) el.value = total || "";
}

// ===== 初始化每日回報 =====
function initReportData() {
  const today = getCurrentDateStr();
  const yesterday = addDaysToDateStr(today, -1);

  const todayData = loadReport(today);
  const yesterdayData = loadReport(yesterday);

  if (todayData) applyDataToForm(todayData);
  recalcTotals();

  // 今日預約自動帶入昨天「明日已排預約」
  const todayBooking = document.getElementById("todayBookingTotal");
  if (
    todayBooking &&
    todayBooking.value === "" &&
    yesterdayData &&
    typeof yesterdayData.tomorrowBookingTotal === "number"
  ) {
    todayBooking.value = yesterdayData.tomorrowBookingTotal;
  }
}

// ===== Morning Huddle + 昨日執行檢視 =====
function initMorningHuddle() {
  const today = getCurrentDateStr();
  const yesterday = addDaysToDateStr(today, -1);
  const dayBefore = addDaysToDateStr(today, -2);

  const yesterdayData = loadReport(yesterday);
  const kpiSource = loadReport(dayBefore);

  if (!yesterdayData || !kpiSource) return;

  // 今日目標
  const map = {
    huddleTodayBooking: yesterdayData.tomorrowBookingTotal,
    huddleTodayCallTotal: yesterdayData.tomorrowKpiCallTotal,
    huddleTodayOld3Y: yesterdayData.tomorrowKpiCallOld3Y,
    huddleTodayTrial: yesterdayData.tomorrowKpiTrial
  };

  Object.entries(map).forEach(([id, val]) => {
    if (typeof val === "number") {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  });

  // 昨日執行檢視
  function renderCheck(id, actual, target) {
    const el = document.getElementById(id);
    if (!el || target === 0) return;
    el.textContent =
      `目標 ${target} / 執行 ${actual}　` +
      (actual >= target ? "✔ 達成" : "✖ 未達成");
  }

  renderCheck(
    "checkTrialText",
    (yesterdayData.trialHA || 0) + (yesterdayData.trialAPAP || 0),
    kpiSource.tomorrowKpiTrial || 0
  );

  renderCheck(
    "checkCallText",
    yesterdayData.todayCallTotal || 0,
    kpiSource.tomorrowKpiCallTotal || 0
  );

  renderCheck(
    "checkInviteText",
    yesterdayData.todayInviteReturn || 0,
    kpiSource.tomorrowKpiCallOld3Y || 0
  );
}

// ===== 產生訊息 =====
function generateMessage() {
  recalcTotals();
  const today = getCurrentDateStr();
  saveReport(today, collectTodayFormData());

  const d = document.getElementById("date").value.replace(/-/g, "/");
  const s = document.getElementById("store").value || "門市";
  const n = document.getElementById("name").value || "姓名";

  document.getElementById("output").value =
`${d}｜${s} ${n}
1. 今日外撥：${getNum("todayCallTotal")} 通（潛在 ${getNum("todayCallPotential")} 通、過保舊客 ${getNum("todayCallOld3Y")} 通）
2. 今日預約：${getNum("todayBookingTotal")} 位
3. 今日到店：${getNum("todayVisitTotal")} 位
   試用：HA ${getNum("trialHA")} 位、APAP ${getNum("trialAPAP")} 位
   成交：HA ${getNum("dealHA")} 位、APAP ${getNum("dealAPAP")} 位
4. 明日已排預約：${getNum("tomorrowBookingTotal")} 位
5. 明日KPI:
   外撥 ${getNum("tomorrowKpiCallTotal")} 通
   舊客預約 ${getNum("tomorrowKpiCallOld3Y")} 位
   完成試戴 ${getNum("tomorrowKpiTrial")} 位`;
}

// ===== 複製 =====
function copyMessage() {
  const o = document.getElementById("output");
  o.select();
  document.execCommand("copy");
  alert("已複製，前往企業微信貼上即可！");
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  getCurrentDateStr();
  initReportData();
  initMorningHuddle();
});