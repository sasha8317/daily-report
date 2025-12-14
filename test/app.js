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

// ✅ 符號＋文字統一（全站唯一來源）
function okText(ok) {
  return ok ? "✔️ 達成" : "✖️ 未達成";
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

function hasDataOnDate(dateStr) {
  return localStorage.getItem(storageKey(dateStr)) != null;
}

/**
 * ✅ 取得「最近一次有資料的日期」（會跳過休假日）
 * @param {string} fromDateStr - 從這天往回找（不含當天，預設找前一天開始）
 * @param {number} maxLookbackDays - 最多往回找幾天（避免無限迴圈）
 * @returns {string|null}
 */
function findPrevDateWithData(fromDateStr, maxLookbackDays = 60) {
  let cursor = addDaysToDateStr(fromDateStr, -1);
  for (let i = 0; i < maxLookbackDays; i++) {
    if (hasDataOnDate(cursor)) return cursor;
    cursor = addDaysToDateStr(cursor, -1);
  }
  return null;
}

/**
 * ✅ 取得「最近兩次有資料的日期」：
 * d1 = 最近一次有資料（上一次上班日）
 * d0 = d1 再往前最近一次有資料（上上一次上班日）
 */
function getPrevTwoDataDates(todayStr) {
  const d1 = findPrevDateWithData(todayStr);
  if (!d1) return { d1: null, d0: null };
  const d0 = findPrevDateWithData(d1);
  return { d1, d0 };
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

  if (isHuddle) renderHuddle();
}

// ===== 今日檢視（預設：最近一次有資料） =====
function renderHuddle() {
  const today = getCurrentDateStr();
  const { d1, d0 } = getPrevTwoDataDates(today);

  // dPrev = 最近一次有資料（上一次上班日）→ 用它的「明日已排預約 / 明日KPI」當作今日目標顯示
  const prevData = d1 ? loadByDate(d1) : null;

  // A) 今日目標（以最近一次有資料為準）
  if ($("huddleTodayBooking")) $("huddleTodayBooking").textContent = prevData?.tomorrowBookingTotal ?? "-";
  if ($("huddleTodayTrial")) $("huddleTodayTrial").textContent = prevData?.tomorrowKpiTrial ?? "-";
  if ($("huddleTodayCallTotal")) $("huddleTodayCallTotal").textContent = prevData?.tomorrowKpiCallTotal ?? "-";
  if ($("huddleTodayOld3Y")) $("huddleTodayOld3Y").textContent = prevData?.tomorrowKpiCallOld3Y ?? "-";

  // 今日預約：提示＆（可選）自動帶入（仍以最近一次有資料的「明日已排預約」為準）
  const hintBox = $("todayBookingHint");
  const hintVal = $("todayBookingHintValue");
  if (hintBox && hintVal && prevData && Number.isFinite(Number(prevData.tomorrowBookingTotal))) {
    hintVal.textContent = prevData.tomorrowBookingTotal;
    hintBox.style.display = "block";

    // 若今日預約空白，就自動帶入
    if ($("todayBookingTotal") && String($("todayBookingTotal").value || "").trim() === "") {
      $("todayBookingTotal").value = prevData.tomorrowBookingTotal;
      saveToday();
    }
  } else if (hintBox) {
    hintBox.style.display = "none";
  }

  // B) 昨日執行檢視（跳過休假日）：
  // 用 d0（上上次有資料）設定的 KPI（明日KPI）對照 d1（上一次有資料）的實績
  const execData = d1 ? loadByDate(d1) : null;
  const kpiSetData = d0 ? loadByDate(d0) : null;

  if (!execData || !kpiSetData) {
    if ($("checkTrialText")) $("checkTrialText").textContent = "（資料不足）";
    if ($("checkCallText")) $("checkCallText").textContent = "（資料不足）";
    if ($("checkInviteText")) $("checkInviteText").textContent = "（資料不足）";
    if ($("checkInviteRateText")) $("checkInviteRateText").textContent = "-";
    const badge = $("checkInviteRateBadge");
    if (badge) badge.style.display = "none";
    return;
  }

  const targetTrial = n(kpiSetData.tomorrowKpiTrial);
  const targetCall = n(kpiSetData.tomorrowKpiCallTotal);
  const targetInvite = n(kpiSetData.tomorrowKpiCallOld3Y);

  const actualTrial = n(execData.trialHA) + n(execData.trialAPAP);
  const actualCall = n(execData.todayCallPotential) + n(execData.todayCallOld3Y);
  const actualInvite = n(execData.todayInviteReturn);

  // ✅ 你要的格式：目標 X / 執行 Y  ✔️ 達成（或 ✖️ 未達成）
  if ($("checkTrialText")) {
    $("checkTrialText").textContent =
      `目標 ${targetTrial} / 執行 ${actualTrial}  ${okText(actualTrial >= targetTrial)}`;
  }

  if ($("checkCallText")) {
    $("checkCallText").textContent =
      `目標 ${targetCall} / 執行 ${actualCall}  ${okText(actualCall >= targetCall)}`;
  }

  if ($("checkInviteText")) {
    $("checkInviteText").textContent =
      `目標 ${targetInvite} / 執行 ${actualInvite}  ${okText(actualInvite >= targetInvite)}`;
  }

  // 邀約成功率：invite / call（保留你右側 badge 的設計）
  const rate = actualCall > 0 ? (actualInvite / actualCall) : 0;
  const pct = Math.round(rate * 100) + "%";
  if ($("checkInviteRateText")) $("checkInviteRateText").textContent = pct;

  const badge = $("checkInviteRateBadge");
  if (badge) {
    badge.style.display = "inline-block";
    badge.classList.remove("green", "yellow", "red");

    if (rate >= 0.30) { badge.classList.add("green"); badge.textContent = "高"; }
    else if (rate >= 0.15) { badge.classList.add("yellow"); badge.textContent = "中"; }
    else { badge.classList.add("red"); badge.textContent = "低"; }
  }
}

// ===== 產生訊息（比照你截圖版本） =====
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

📊 今日執行檢視（以最近一次有資料為準）
${buildPrevDataCheckText(d.date)}
`;

  if ($("output")) $("output").value = msg;
}
window.generateMessage = generateMessage;

// ===== 產生訊息內的「執行檢視」段落（• 條列＋✔️/✖️＋文字） =====
function buildPrevDataCheckText(todayStr) {
  const { d1, d0 } = getPrevTwoDataDates(todayStr);

  const execData = d1 ? loadByDate(d1) : null;    // 最近一次有資料 → 實績
  const kpiSetData = d0 ? loadByDate(d0) : null;  // 上上次有資料 → KPI 目標（明日KPI）

  if (!execData || !kpiSetData) {
    return "•（找不到足夠的歷史資料：需要「最近一次有資料」與「再往前一次有資料」）";
  }

  const targetTrial = n(kpiSetData.tomorrowKpiTrial);
  const targetCall  = n(kpiSetData.tomorrowKpiCallTotal);
  const targetInvite = n(kpiSetData.tomorrowKpiCallOld3Y);

  const actualTrial = n(execData.trialHA) + n(execData.trialAPAP);
  const actualCall  = n(execData.todayCallPotential) + n(execData.todayCallOld3Y);
  const actualInvite = n(execData.todayInviteReturn);

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

  // 載入當天資料
  const data = loadByDate(today);
  if (data) fillForm(data);
  recalcTotals();

  dateInput.addEventListener("change", () => {
    const ds = getCurrentDateStr();

    // 清空再填（避免殘留）
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
