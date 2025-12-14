console.log("✅ official app.js loaded");

// ================================
// 基本設定
// ================================

// ✅ 正式版儲存前綴
const STORAGE_PREFIX = "daily-report-";

// ✅ Apps Script Web App（你已確認過）
const SHEET_INGEST_URL =
  "https://script.google.com/macros/s/AKfycbxwYN_YGa5W8Fqg8YrSPTFkhkqnLB61hZ3lFgU-5kIHTSK_DmasH573pv7GutF8wf8S/exec";

const INGEST_KEY = "dailyreport-key-2025";

// ================================
// 日期工具
// ================================

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

// ================================
// localStorage
// ================================

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

// ================================
// 防止重複送出（同一天同內容）
// ================================

function getSentKey(dateStr) {
  return STORAGE_PREFIX + "sent-" + dateStr;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

function getLastSentInfo(dateStr) {
  try {
    const raw = localStorage.getItem(getSentKey(dateStr));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function markSent(dateStr, msgText) {
  localStorage.setItem(
    getSentKey(dateStr),
    JSON.stringify({
      sentAt: new Date().toISOString(),
      msgHash: simpleHash(msgText || "")
    })
  );
}

// ================================
// ✅ 寫入 Google Sheets（no-cors 最穩定）
// ================================

async function sendReportToSheet(payload) {
  fetch(SHEET_INGEST_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      key: INGEST_KEY,
      ...payload
    })
  });
  return true;
}

// ================================
// 表單工具
// ================================

function getNum(id) {
  const el = document.getElementById(id);
  return parseInt((el && el.value) || 0);
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null || value === "") return;
  el.value = value;
}

// ================================
// 套回資料
// ================================

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

// ================================
// 計算
// ================================

function recalcTotals() {
  const total = getNum("todayCallPotential") + getNum("todayCallOld3Y");
  const el = document.getElementById("todayCallTotal");
  if (el) el.value = total || "";
}

// ================================
// 初始化
// ================================

function initReportData() {
  const today = getCurrentDateStr();
  const yesterday = addDaysToDateStr(today, -1);

  const todayData = loadReport(today);
  const yesterdayData = loadReport(yesterday);

  if (todayData) applyDataToForm(todayData);
  recalcTotals();

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

// ================================
// ✅ 產生訊息（＋寫入 Sheet）
// ================================

async function generateMessage() {
  recalcTotals();

  const today = getCurrentDateStr();
  const todayData = collectTodayFormData();
  saveReport(today, todayData);

  const d = today.replace(/-/g, "/");
  const s = todayData.store || "門市";
  const n = todayData.name || "姓名";

  const callTotal = todayData.todayCallTotal;
  const trialTotal = todayData.trialHA + todayData.trialAPAP;

  const msg =
`${d}｜${s} ${n}
1. 今日外撥：${callTotal} 通
2. 今日預約：${todayData.todayBookingTotal} 位
3. 今日到店：${todayData.todayVisitTotal} 位
　試用：${trialTotal} 位
　成交：HA ${todayData.dealHA}、APAP ${todayData.dealAPAP}
4. 明日已排預約：${todayData.tomorrowBookingTotal} 位
5. 明日KPI：
　完成試戴 ${todayData.tomorrowKpiTrial} 位
　外撥 ${todayData.tomorrowKpiCallTotal} 通
　舊客預約 ${todayData.tomorrowKpiCallOld3Y} 位`;

  document.getElementById("output").value = msg;

  const last = getLastSentInfo(today);
  if (last && last.msgHash === simpleHash(msg)) return;

  await sendReportToSheet({
    date: todayData.date,
    store: todayData.store,
    name: todayData.name,

    calls_total: todayData.todayCallTotal,
    calls_potential: todayData.todayCallPotential,
    calls_old: todayData.todayCallOld3Y,

    appt_today: todayData.todayBookingTotal,
    visit_today: todayData.todayVisitTotal,

    trial_ha: todayData.trialHA,
    trial_apap: todayData.trialAPAP,
    deal_ha: todayData.dealHA,
    deal_apap: todayData.dealAPAP,

    appt_tomorrow: todayData.tomorrowBookingTotal,
    kpi_call_tomorrow: todayData.tomorrowKpiCallTotal,
    kpi_old_appt_tomorrow: todayData.tomorrowKpiCallOld3Y,
    kpi_trial_tomorrow: todayData.tomorrowKpiTrial,

    message_text: msg
  });

  markSent(today, msg);
}

// ================================
// 複製
// ================================

function copyMessage() {
  const o = document.getElementById("output");
  if (!o) return;
  o.select();
  document.execCommand("copy");
  alert("已複製！");
}

// ================================
// Init
// ================================

document.addEventListener("DOMContentLoaded", () => {
  getCurrentDateStr();
  initReportData();
});
