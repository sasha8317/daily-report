console.log("✅ test app.js loaded");

// ✅ Power Automate（HTTP Trigger）URL：把你貼的 URL 放在這裡
const FLOW_API_URL =
  "https://default6001594ba4a44549a0e1abb0cd4cc0.45.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ce8547d0ef7541ac8fc7d3f1df9c73ff/triggers/manual/paths/invoke?api-version=1";

// 專門給 test 版用的儲存前綴
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

// ===== ✅ 送資料到 OneDrive（Power Automate HTTP Trigger） =====

async function sendReportToOneDrive(data) {
  if (!FLOW_API_URL) return;

  try {
    const payload = {
      ...data,
      created_at: new Date().toISOString(),
      source: "test-index"
    };

    const res = await fetch(FLOW_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // Power Automate 有時回 202 / 200 都算成功，這裡只做紀錄
    if (!res.ok) {
      console.warn("⚠️ 已送出但回應非 2xx", res.status);
    } else {
      console.log("✅ 已送出到 OneDrive");
    }
  } catch (err) {
    console.error("❌ 送出到 OneDrive 失敗", err);
  }
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

// ===== Morning Huddle（含昨日執行檢視） =====

function initMorningHuddle() {
  const today = getCurrentDateStr();
  const yesterday = addDaysToDateStr(today, -1);
  const dayBefore = addDaysToDateStr(today, -2);

  const yesterdayData = loadReport(yesterday);
  const kpiSource = loadReport(dayBefore);

  if (!yesterdayData || !kpiSource) return;

  // 今日目標
  if (typeof yesterdayData.tomorrowBookingTotal === "number")
    document.getElementById("huddleTodayBooking").textContent = yesterdayData.tomorrowBookingTotal;

  if (typeof yesterdayData.tomorrowKpiCallTotal === "number")
    document.getElementById("huddleTodayCallTotal").textContent = yesterdayData.tomorrowKpiCallTotal;

  if (typeof yesterdayData.tomorrowKpiCallOld3Y === "number")
    document.getElementById("huddleTodayOld3Y").textContent = yesterdayData.tomorrowKpiCallOld3Y;

  if (typeof yesterdayData.tomorrowKpiTrial === "number")
    document.getElementById("huddleTodayTrial").textContent = yesterdayData.tomorrowKpiTrial;

  // ===== 昨日執行檢視（顯示：目標 X / 執行 Y ✔/✖）=====

  function renderCheck(id, actual, target) {
    const el = document.getElementById(id);
    if (!el) return;

    const a = Number(actual) || 0;
    const t = Number(target) || 0;
    const ok = a >= t;

    el.textContent = `目標 ${t} / 執行 ${a}　${ok ? "✔ 達成" : "✖ 未達成"}`;
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

  // 邀約成功率
  const rateText = document.getElementById("checkInviteRateText");
  const badge = document.getElementById("checkInviteRateBadge");

  const calls = yesterdayData.todayCallTotal || 0;
  const invites = yesterdayData.todayInviteReturn || 0;

  if (rateText && badge) {
    if (calls > 0) {
      const rate = Math.round((invites / calls) * 100);
      rateText.textContent = `${rate}%`;
      badge.style.display = "inline-block";
      badge.className = "badge " + (rate >= 20 ? "green" : rate >= 10 ? "yellow" : "red");
      badge.textContent = rate >= 20 ? "高" : rate >= 10 ? "中" : "低";
    } else {
      rateText.textContent = `-`;
      badge.style.display = "none";
    }
  }
}

// ===== 產生訊息 =====

function generateMessage() {
  recalcTotals();
  const today = getCurrentDateStr();
  const data = collectTodayFormData();
  saveReport(today, data);

  const d = (document.getElementById("date")?.value || "").replace(/-/g, "/");
  const s = document.getElementById("store")?.value || "門市";
  const n = document.getElementById("name")?.value || "姓名";

  const output = document.getElementById("output");
  if (!output) return;

  output.value =
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

// ===== 複製（✅ 同步送 OneDrive，不增加同仁步驟）=====

function copyMessage() {
  // 先確保總外撥是最新的
  recalcTotals();

  // ✅ 先存 localStorage（照舊）
  const today = getCurrentDateStr();
  const data = collectTodayFormData();
  saveReport(today, data);

  // ✅ 同步送到 OneDrive（Power Automate）
  // 不擋住複製流程：送出失敗也不影響同仁操作
  sendReportToOneDrive(data);

  const o = document.getElementById("output");
  if (!o) return;

  o.select();
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
