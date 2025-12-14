console.log("✅ official app.js loaded");

// ✅ 正式版儲存前綴（避免跟測試版混在一起）
const STORAGE_PREFIX = "daily-report-";

/** =========================
 *  ✅ B方案：寫入 Google Sheets 的設定
 *  你只要改這兩個
 *  ========================= */
const SHEET_INGEST_URL = "https://script.google.com/macros/s/AKfycbxwYN_YGa5W8Fqg8YrSPTFkhkqnLB61hZ3lFgU-5kIHTSK_DmasH573pv7GutF8wf8S/exec";
const INGEST_KEY = "dailyreport-key-2025"; // 要跟 Apps Script 端一致

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

/** =========================
 *  ✅ 防止重複送出（同一天同內容就不再送）
 *  ========================= */
function getSentKey(dateStr) {
  return STORAGE_PREFIX + "sent-" + dateStr;
}

function simpleHash(str) {
  // 非加密，只是用來判斷「內容有沒有變」
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
  const info = {
    sentAt: new Date().toISOString(),
    msgHash: simpleHash(msgText || "")
  };
  localStorage.setItem(getSentKey(dateStr), JSON.stringify(info));
}

/** =========================
 *  ✅ 寫入 Google Sheets（Apps Script Web App）
 *  ========================= */
async function sendReportToSheet(payload) {
  if (!SHEET_INGEST_URL || SHEET_INGEST_URL.includes("請貼上")) {
    console.warn("⚠️ SHEET_INGEST_URL 尚未設定，略過送出到 Google Sheets");
    return { ok: false, skipped: true };
  }

  const res = await fetch(SHEET_INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: INGEST_KEY, ...payload })
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok || data.ok !== true) {
    throw new Error(data.error || "sendReportToSheet failed");
  }
  return { ok: true };
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

// ===== 計算 =====

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

  // 今日預約：若空白，帶入昨日的「明日已排預約」
  const todayBooking = document.getElementById("todayBookingTotal");
  const hint = document.getElementById("todayBookingHint");
  const hintValue = document.getElementById("todayBookingHintValue");

  if (
    todayBooking &&
    todayBooking.value === "" &&
    yesterdayData &&
    typeof yesterdayData.tomorrowBookingTotal === "number"
  ) {
    todayBooking.value = yesterdayData.tomorrowBookingTotal;
    if (hint && hintValue) {
      hintValue.textContent = yesterdayData.tomorrowBookingTotal;
      hint.style.display = "block";
    }
  }
}

// ===== Morning Huddle（含昨日執行檢視：前天KPI對照昨天） =====

function initMorningHuddle() {
  const today = getCurrentDateStr();
  const yesterday = addDaysToDateStr(today, -1);
  const dayBefore = addDaysToDateStr(today, -2);

  const yesterdayData = loadReport(yesterday);
  const kpiSource = loadReport(dayBefore);

  if (!yesterdayData) return;

  // 今日目標（昨天填的「明日」）
  if (typeof yesterdayData.tomorrowBookingTotal === "number")
    document.getElementById("huddleTodayBooking").textContent = yesterdayData.tomorrowBookingTotal;

  if (typeof yesterdayData.tomorrowKpiCallTotal === "number")
    document.getElementById("huddleTodayCallTotal").textContent = yesterdayData.tomorrowKpiCallTotal;

  if (typeof yesterdayData.tomorrowKpiCallOld3Y === "number")
    document.getElementById("huddleTodayOld3Y").textContent = yesterdayData.tomorrowKpiCallOld3Y;

  if (typeof yesterdayData.tomorrowKpiTrial === "number")
    document.getElementById("huddleTodayTrial").textContent = yesterdayData.tomorrowKpiTrial;

  // 昨日執行檢視（前天KPI 對照 昨天實際）
  if (!kpiSource) return;

  function renderCheck(id, actual, target) {
    const el = document.getElementById(id);
    if (!el) return;

    // target = 0 視為沒有設定 KPI
    if (!target) {
      el.textContent = `目標 - / 執行 ${actual}　—`;
      return;
    }
    const ok = actual >= target;
    el.textContent = `目標 ${target} / 執行 ${actual}　${ok ? "✔ 達成" : "✖ 未達成"}`;
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

  // 邀約成功率（Badge維持原本）
  const rateText = document.getElementById("checkInviteRateText");
  const badge = document.getElementById("checkInviteRateBadge");

  const calls = yesterdayData.todayCallTotal || 0;
  const invites = yesterdayData.todayInviteReturn || 0;

  if (rateText) rateText.textContent = "-";
  if (badge) badge.style.display = "none";

  if (calls > 0 && rateText && badge) {
    const rate = Math.round((invites / calls) * 100);
    rateText.textContent = `${rate}%`;
    badge.style.display = "inline-block";
    badge.className = "badge " + (rate >= 20 ? "green" : rate >= 10 ? "yellow" : "red");
    badge.textContent = rate >= 20 ? "高" : rate >= 10 ? "中" : "低";
  }
}

// ===== ✅ 產生訊息（加入：成功邀約回店 + 今日執行檢視(對照昨日KPI) + ✅送到Google Sheets）=====

async function generateMessage() {
  recalcTotals();

  const today = getCurrentDateStr();
  const yesterday = addDaysToDateStr(today, -1);
  const yesterdayData = loadReport(yesterday); // ✅ 用昨天的「明日KPI」當今天對照來源

  // 先把今天資料存起來
  const todayData = collectTodayFormData();
  saveReport(today, todayData);

  const d = (document.getElementById("date").value || "").replace(/-/g, "/");
  const s = document.getElementById("store").value || "門市";
  const n = document.getElementById("name").value || "姓名";

  const callTotal = getNum("todayCallTotal");
  const callPotential = getNum("todayCallPotential");
  const callOld3Y = getNum("todayCallOld3Y");
  const inviteReturn = getNum("todayInviteReturn");

  const trialTotal = getNum("trialHA") + getNum("trialAPAP");

  // ===== 今日執行檢視（對照昨日 KPI）=====
  function buildTodayCheckBlock() {
    if (!yesterdayData) return ""; // 找不到昨日資料就先不顯示

    const targetTrial = yesterdayData.tomorrowKpiTrial || 0;
    const targetCall = yesterdayData.tomorrowKpiCallTotal || 0;
    const targetInvite = yesterdayData.tomorrowKpiCallOld3Y || 0;

    const line = (label, target, actual) => {
      if (!target) return `・${label}：目標 - / 執行 ${actual}`;
      return `・${label}：目標 ${target} / 執行 ${actual}　${actual >= target ? "✔ 達成" : "✖ 未達成"}`;
    };

    let rateLine = "・邀約成功率：-";
    if (callTotal > 0) {
      const rate = Math.round((inviteReturn / callTotal) * 100);
      rateLine = `・邀約成功率：${rate}%`;
    }

    return `
📊 今日執行檢視（對照昨日 KPI）
${line("試戴數", targetTrial, trialTotal)}
${line("外撥通數", targetCall, callTotal)}
${line("邀約回店數", targetInvite, inviteReturn)}
${rateLine}`;
  }

  const checkBlock = buildTodayCheckBlock();

  // ✅ 你要的訊息格式（含「成功邀約回店」）
  const msg =
`${d}｜${s} ${n}
1. 今日外撥：
　${callTotal} 通（潛在 ${callPotential} 通、過保舊客 ${callOld3Y} 通）
　成功邀約回店 ${inviteReturn} 位
2. 今日預約：${getNum("todayBookingTotal")} 位
3. 今日到店：${getNum("todayVisitTotal")} 位
　試用：HA ${getNum("trialHA")} 位、APAP ${getNum("trialAPAP")} 位
　成交：HA ${getNum("dealHA")} 位、APAP ${getNum("dealAPAP")} 位
4. 明日已排預約：${getNum("tomorrowBookingTotal")} 位
5. 明日KPI：
　完成試戴 ${getNum("tomorrowKpiTrial")} 位
　外撥 ${getNum("tomorrowKpiCallTotal")} 通
　舊客預約 ${getNum("tomorrowKpiCallOld3Y")} 位${checkBlock ? "\n" + checkBlock : ""}`;

  document.getElementById("output").value = msg;

  /** =========================
   *  ✅ 送到 Google Sheets（集中資料）
   *  - 同一天同內容就不重送
   *  ========================= */
  try {
    const last = getLastSentInfo(today);
    const currentHash = simpleHash(msg);
    if (last && last.msgHash === currentHash) {
      console.log("ℹ️ 已送出過相同內容，略過重複送出到 Google Sheets");
      return;
    }

    const payload = {
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
    };

    await sendReportToSheet(payload);
    markSent(today, msg);
    console.log("✅ 已送出到 Google Sheets");
  } catch (err) {
    console.error("❌ 送出到 Google Sheets 失敗：", err);
    alert("⚠️ 已產生訊息，但同步到督導 Dashboard 失敗。\n請確認網路、或通知督導協助檢查設定。");
  }
}

// ===== 複製 =====

function copyMessage() {
  const o = document.getElementById("output");
  if (!o) return;
  o.select();
  o.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert("已複製，前往企業微信貼上即可！");
}

// ===== Tabs =====

function setupTabs() {
  const h = document.getElementById("tab-huddle");
  const r = document.getElementById("tab-report");
  const hv = document.getElementById("huddle-view");
  const rv = document.getElementById("report-view");

  if (!h || !r || !hv || !rv) return;

  h.onclick = () => {
    hv.classList.remove("hidden");
    rv.classList.add("hidden");
    h.classList.add("active");
    r.classList.remove("active");
  };

  r.onclick = () => {
    hv.classList.add("hidden");
    rv.classList.remove("hidden");
    r.classList.add("active");
    h.classList.remove("active");
  };
}

// ===== Init =====

document.addEventListener("DOMContentLoaded", () => {
  getCurrentDateStr();
  setupTabs();
  initReportData();
  initMorningHuddle();
});
