console.log("✅ test app.js loaded");

// 專門給 test 版用的儲存前綴
const STORAGE_PREFIX = "daily-report-test-";

// ===== 日期工具 =====

// 取得目前畫面上 #date 的日期（YYYY-MM-DD）
// 若沒填，則回傳今天日期
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

// 在日期字串上加減天數（delta 可為負）
function addDaysToDateStr(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const mm = ("0" + (dt.getMonth() + 1)).slice(-2);
  const dd = ("0" + dt.getDate()).slice(-2);
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

// ===== localStorage 工具 =====

function getStorageKey(dateStr) {
  return STORAGE_PREFIX + dateStr;
}

function loadReport(dateStr) {
  try {
    const raw = localStorage.getItem(getStorageKey(dateStr));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("loadReport 解析失敗", e);
    return null;
  }
}

function saveReport(dateStr, data) {
  try {
    localStorage.setItem(getStorageKey(dateStr), JSON.stringify(data));
  } catch (e) {
    console.warn("saveReport 失敗", e);
  }
}

// ===== 表單欄位工具 =====

function getNum(id) {
  const el = document.getElementById(id);
  return parseInt((el && el.value) || 0);
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value === undefined || value === null || value === "") return;
  el.value = value;
}

// 把 localStorage 中的資料，套回今天的表單
function applyDataToForm(data) {
  if (!data) return;

  setInputValue("store", data.store);
  setInputValue("name", data.name);

  setInputValue("todayCallPotential", data.todayCallPotential);
  setInputValue("todayCallOld3Y", data.todayCallOld3Y);
  setInputValue("todayCallTotal", data.todayCallTotal);
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

// 從今天表單蒐集資料，準備存入 localStorage
function collectTodayFormData() {
  const data = {};
  const dateStr = getCurrentDateStr();
  data.date = dateStr;

  const storeEl = document.getElementById("store");
  const nameEl = document.getElementById("name");
  data.store = (storeEl && storeEl.value) || "";
  data.name = (nameEl && nameEl.value) || "";

  data.todayCallPotential = getNum("todayCallPotential");
  data.todayCallOld3Y = getNum("todayCallOld3Y");
  data.todayCallTotal = getNum("todayCallTotal");
  data.todayBookingTotal = getNum("todayBookingTotal");
  data.todayVisitTotal = getNum("todayVisitTotal");
  data.trialHA = getNum("trialHA");
  data.trialAPAP = getNum("trialAPAP");
  data.dealHA = getNum("dealHA");
  data.dealAPAP = getNum("dealAPAP");

  data.tomorrowBookingTotal = getNum("tomorrowBookingTotal");
  data.tomorrowKpiCallTotal = getNum("tomorrowKpiCallTotal");
  data.tomorrowKpiCallOld3Y = getNum("tomorrowKpiCallOld3Y");
  data.tomorrowKpiTrial = getNum("tomorrowKpiTrial");

  return data;
}

// ===== 原本的邏輯：日期預設 + 計算總外撥 =====

function setDefaultDate() {
  // 讓 #date 預設是今天，但如果之後你想改日期也可以
  getCurrentDateStr();
}

// 計算今日外撥總通數
function recalcTotals() {
  const total =
    getNum("todayCallPotential") + getNum("todayCallOld3Y");
  const inputTotal = document.getElementById("todayCallTotal");
  if (inputTotal) {
    inputTotal.value = total || "";
  }
}

// ===== 初始化每日回報資料（自動帶入昨天 / 建議 KPI） =====

function initReportData() {
  const todayStr = getCurrentDateStr();
  const yesterdayStr = addDaysToDateStr(todayStr, -1);

  const todayData = loadReport(todayStr);
  const yesterdayData = loadReport(yesterdayStr);

  // 1) 先把今天已經存過的資料套回來
  if (todayData) {
    applyDataToForm(todayData);
  }

  // 2) 計算「今日外撥總通數」
  recalcTotals();

  // 3) 如果「今日預約總數」是空的，且昨天有「明日預約總數」，就自動帶入
  const todayBookingInput = document.getElementById("todayBookingTotal");
  if (
    todayBookingInput &&
    todayBookingInput.value === "" &&
    yesterdayData &&
    typeof yesterdayData.tomorrowBookingTotal === "number"
  ) {
    todayBookingInput.value = yesterdayData.tomorrowBookingTotal;
  }

  // 4) 如果「明日預約總數」之前有存過，就先帶出（否則留空給使用者填）
  const tomorrowBookingInput = document.getElementById("tomorrowBookingTotal");
  if (
    tomorrowBookingInput &&
    todayData &&
    typeof todayData.tomorrowBookingTotal === "number"
  ) {
    tomorrowBookingInput.value = todayData.tomorrowBookingTotal;
  }

// 5) 明日 KPI：只帶出自己之前填過的數字，不自動產生建議
const kpiCall = document.getElementById("tomorrowKpiCallTotal");
const kpiOld = document.getElementById("tomorrowKpiCallOld3Y");
const kpiTrial = document.getElementById("tomorrowKpiTrial");

if (todayData) {
  if (kpiCall && typeof todayData.tomorrowKpiCallTotal === "number") {
    kpiCall.value = todayData.tomorrowKpiCallTotal;
  }
  if (kpiOld && typeof todayData.tomorrowKpiCallOld3Y === "number") {
    kpiOld.value = todayData.tomorrowKpiCallOld3Y;
  }
  if (kpiTrial && typeof todayData.tomorrowKpiTrial === "number") {
    kpiTrial.value = todayData.tomorrowKpiTrial;
  }
}

}

// ===== Morning Huddle 初始化（從昨天的「明日」帶到今天） =====

function initMorningHuddle() {
  const todayStr = getCurrentDateStr();
  const yesterdayStr = addDaysToDateStr(todayStr, -1);
  const yesterdayData = loadReport(yesterdayStr);

  const hBooking = document.getElementById("huddleTodayBooking");
  const hCall = document.getElementById("huddleTodayCallTotal");
  const hOld = document.getElementById("huddleTodayOld3Y");
  const hTrial = document.getElementById("huddleTodayTrial");

  if (!hBooking || !hCall || !hOld || !hTrial) return;

  if (yesterdayData) {
    // 今日預約目標 = 昨天的「明日預約總數」
    if (typeof yesterdayData.tomorrowBookingTotal === "number") {
      hBooking.value = yesterdayData.tomorrowBookingTotal;
    }

    // 今日 KPI 目標 = 昨天寫的「明日 KPI」
    if (typeof yesterdayData.tomorrowKpiCallTotal === "number") {
      hCall.value = yesterdayData.tomorrowKpiCallTotal;
    }
    if (typeof yesterdayData.tomorrowKpiCallOld3Y === "number") {
      hOld.value = yesterdayData.tomorrowKpiCallOld3Y;
    }
    if (typeof yesterdayData.tomorrowKpiTrial === "number") {
      hTrial.value = yesterdayData.tomorrowKpiTrial;
    }
  }
}

// ===== 產生訊息（+順便存今天的資料） =====

function generateMessage() {
  // 先更新外撥總通數
  recalcTotals();

  // 在產生文字之前，把今天資料存起來
  const todayStr = getCurrentDateStr();
  const data = collectTodayFormData();
  saveReport(todayStr, data);

  const dateValue = document.getElementById("date").value || "";
  const d = dateValue.replace(/-/g, "/");
  const s = document.getElementById("store").value || "門市";
  const n = document.getElementById("name").value || "姓名";

  const msg =
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

  const output = document.getElementById("output");
  if (output) {
    output.value = msg;
  }
}

// ===== 複製訊息（維持原本功能） =====

function copyMessage() {
  const o = document.getElementById("output");
  if (!o) return;

  o.select();
  o.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert("已複製，前往企業微信貼上即可！");
}

// ===== 分頁切換：Morning Huddle / 每日回報 =====

function setupTabs() {
  const tabHuddle = document.getElementById("tab-huddle");
  const tabReport = document.getElementById("tab-report");
  const huddleView = document.getElementById("huddle-view");
  const reportView = document.getElementById("report-view");

  if (!tabHuddle || !tabReport || !huddleView || !reportView) {
    console.warn("有些 tab 或 section 找不到，請檢查 index.html 的 id 是否對應。");
    return;
  }

  // 預設顯示「每日回報」
  huddleView.classList.add("hidden");
  reportView.classList.remove("hidden");
  tabReport.classList.add("active");
  tabHuddle.classList.remove("active");

  tabHuddle.addEventListener("click", () => {
    huddleView.classList.remove("hidden");
    reportView.classList.add("hidden");
    tabHuddle.classList.add("active");
    tabReport.classList.remove("active");
  });

  tabReport.addEventListener("click", () => {
    huddleView.classList.add("hidden");
    reportView.classList.remove("hidden");
    tabReport.classList.add("active");
    tabHuddle.classList.remove("active");
  });
}

// ===== 初始化 =====

document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();     // 設定日期預設值
  setupTabs();          // 分頁切換
  initReportData();     // 自動帶入昨天、產生 KPI 建議
  initMorningHuddle();  // Morning Huddle 顯示「昨天寫的明日目標」
});
