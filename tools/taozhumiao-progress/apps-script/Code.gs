const SPREADSHEET_ID = "1_vblpEZtfs7oj7yH2EXzOUMZYI_8OmG9hdc4ASQd3e8";
const SHEETS = {
  tasks: "任務明細",
  updates: "進度更新紀錄",
  expenses: "經費支出紀錄",
  cases: "案件追蹤列管",
  caseUpdates: "案件進度紀錄",
  consultations: "諮詢輔導場次",
  modificationHistory: "修改歷程",
};
const ALLOWED_REPORTERS = [];
const UPDATE_HEADERS = [
  "更新ID",
  "任務ID",
  "工項ID",
  "更新日期",
  "更新人",
  "進度內容",
  "完成狀態",
  "下次追蹤日期",
  "備註",
  "佐證資料連結",
  "最後修改人",
  "最後修改時間",
];
const CASE_UPDATE_HEADERS = [
  "案件更新ID",
  "案件ID",
  "回報日期",
  "回報人",
  "最新進度",
  "狀態",
  "完成/解除列管說明",
  "佐證資料連結",
  "備註",
  "最後修改人",
  "最後修改時間",
];
const EXPENSE_HEADERS = [
  "經費ID",
  "任務ID",
  "工項ID",
  "來源工作表/工項",
  "金額",
  "費用明細",
  "支出日期",
  "填報人",
  "憑證連結",
  "備註",
];
const CASE_HEADERS = [
  "案件ID",
  "案件名稱",
  "指定同事",
  "交辦內容",
  "查核點",
  "Deadline",
  "目前進度說明",
  "狀態",
  "優先序",
  "回報人",
  "回報時間",
  "備註",
  "佐證資料連結",
  "完成/解除列管說明",
  "解除列管時間",
  "最後修改人",
  "最後修改時間",
];
const CONSULTATION_HEADERS = [
  "場次ID",
  "工項ID",
  "月份",
  "單位名稱",
  "輔導日期",
  "開始時間",
  "結束時間",
  "地點",
  "輔導老師",
  "分署人員",
  "單位人員",
  "相關人員",
  "負責同仁",
  "狀態",
  "輔導主題",
  "會議紀錄/備註",
  "佐證資料連結",
  "建立人",
  "建立時間",
  "最後更新時間",
  "最後修改人",
  "最後修改時間",
];
const MODIFICATION_HISTORY_HEADERS = [
  "修改ID",
  "資料表",
  "記錄ID",
  "欄位",
  "原值",
  "新值",
  "修改人",
  "修改時間",
  "修改來源",
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || "listTasks";
  try {
    if (action === "health") {
      return jsonp_(params.callback, { ok: true, message: "ok" });
    }
    if (action === "listTasks") {
      return jsonp_(params.callback, { ok: true, tasks: listTasks_() });
    }
    if (action === "listData") {
      return jsonp_(params.callback, listData_());
    }
    if (action === "prepareConsultations") {
      return jsonp_(params.callback, prepareConsultations_());
    }
    return jsonp_(params.callback, { ok: false, error: "Unknown action" });
  } catch (error) {
    return jsonp_(params.callback, { ok: false, error: error.message });
  }
}

function listData_() {
  return {
    ok: true,
    items: listItems_(),
    tasks: listTasks_(),
    updates: listRecords_(SHEETS.updates),
    expenses: listRecords_(SHEETS.expenses),
    cases: listRecords_(SHEETS.cases),
    caseUpdates: listRecords_(SHEETS.caseUpdates),
    consultations: listRecords_(SHEETS.consultations),
  };
}

function authorize_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return {
    ok: true,
    spreadsheetName: spreadsheet.getName(),
    spreadsheetId: SPREADSHEET_ID,
  };
}

function authorize() {
  return authorize_();
}

function prepareConsultations_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureSheet_(spreadsheet, SHEETS.consultations, CONSULTATION_HEADERS);
  return {
    ok: true,
    sheetName: SHEETS.consultations,
  };
}

function listItems_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getItemSheet_(spreadsheet);
  if (!sheet) return [];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row[0])
    .map((row) => {
      const record = rowToObject_(headers, row);
      return {
        itemId: record["工項ID"],
        itemName: record["工作項目"],
        performance: record["執行績效及內容"] || record["履約標的及績效"],
        budget: record["核定/預估經費"] || record["經費"],
        progressRatio: record["執行進度比例"] || record["工作進度"],
        owner: record["主責及協辦"] || record["主責同仁"],
        coOwner: record["協辦同仁"],
        period: record["預計執行時程"],
        schedule: record["表定時間摘要"] || record["工作執行時程規劃"],
        currentStatus: record["執行現況說明"],
        expenseNote: record["經費項目"] || record["費用說明"],
        updatedBy: record["最後更新人"],
        updatedAt: record["最後更新時間"],
      };
    });
}

function listRecords_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => rowToObject_(headers, row));
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const params = parsePost_(e);
    if (params.action === "submitItemProgress") {
      checkReporter_(params.reporter);
      const result = submitItemProgress_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "editItemProgress") {
      checkReporter_(params.reporter);
      const result = editItemProgress_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "submitCaseTracking") {
      checkReporter_(params.reporter);
      const result = submitCaseTracking_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "editCaseTracking") {
      checkReporter_(params.reporter);
      const result = editCaseTracking_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "submitCaseProgress") {
      checkReporter_(params.reporter);
      const result = submitCaseProgress_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "editCaseProgress") {
      checkReporter_(params.reporter);
      const result = editCaseProgress_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "submitConsultationSession") {
      checkReporter_(params.reporter);
      const result = submitConsultationSession_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "editConsultationSession") {
      checkReporter_(params.reporter);
      const result = editConsultationSession_(params);
      return json_({ ok: true, result });
    }
    if (params.action !== "submitProgress") {
      return json_({ ok: false, error: "Unknown action" });
    }
    checkReporter_(params.reporter);
    const result = submitProgress_(params);
    return json_({ ok: true, result });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function submitConsultationSession_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheet_(spreadsheet, SHEETS.consultations, CONSULTATION_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const sessionId = nextConsultationId_(sheet, params.month || timestamp.slice(0, 7));

  sheet.appendRow([
    sessionId,
    params.itemId || "ITEM001",
    params.month || "",
    params.unitName || "",
    params.date || "",
    params.startTime || "",
    params.endTime || "",
    params.location || "",
    params.teacher || "",
    params.branchStaff || "",
    params.unitStaff || "",
    params.relatedStaff || "",
    params.owner || "",
    params.status || "預排",
    params.topic || "",
    params.note || "",
    params.attachment || "",
    params.reporter || "",
    timestamp,
    timestamp,
    "",
    "",
  ]);

  return { sessionId, updatedAt: timestamp };
}

function editConsultationSession_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheet_(spreadsheet, SHEETS.consultations, CONSULTATION_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const row = findSessionRow_(sheet, params.sessionId);
  if (!row) throw new Error("找不到場次ID：" + params.sessionId);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const history = buildModificationContext_(spreadsheet, SHEETS.consultations, params.sessionId, params.reporter, timestamp, "editConsultationSession");
  setByHeaderWithHistory_(sheet, headers, row, "工項ID", params.itemId || "ITEM001", history);
  setByHeaderWithHistory_(sheet, headers, row, "月份", params.month || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "單位名稱", params.unitName || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "輔導日期", params.date || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "開始時間", params.startTime || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "結束時間", params.endTime || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "地點", params.location || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "輔導老師", params.teacher || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "分署人員", params.branchStaff || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "單位人員", params.unitStaff || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "相關人員", params.relatedStaff || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "負責同仁", params.owner || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "狀態", params.status || "預排", history);
  setByHeaderWithHistory_(sheet, headers, row, "輔導主題", params.topic || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "會議紀錄/備註", params.note || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "佐證資料連結", params.attachment || "", history);
  setByHeaderWithHistory_(sheet, headers, row, "建立人", params.reporter || "", history);
  setByHeader_(sheet, headers, row, "最後更新時間", timestamp);
  setByHeader_(sheet, headers, row, "最後修改人", params.reporter || "");
  setByHeader_(sheet, headers, row, "最後修改時間", timestamp);

  return { sessionId: params.sessionId, modifiedAt: timestamp };
}

function submitCaseTracking_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const caseSheet = ensureSheet_(spreadsheet, SHEETS.cases, CASE_HEADERS);
  const updateSheet = ensureSheet_(spreadsheet, SHEETS.caseUpdates, CASE_UPDATE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const caseId = nextCaseId_(caseSheet);

  caseSheet.appendRow([
    caseId,
    params.title || "",
    params.assignee || "",
    params.instruction || "",
    params.checkpoint || "",
    params.deadline || "",
    params.progress || "",
    params.status || "待執行",
    params.priority || "一般",
    params.reporter || "",
    timestamp,
    params.note || "",
    params.attachment || "",
    params.status === "已完成" ? (params.completion || params.progress || "") : "",
    params.status === "已完成" ? timestamp : "",
    "",
    "",
  ]);

  appendCaseUpdate_(updateSheet, {
    caseId,
    reporter: params.reporter,
    progress: params.progress,
    status: params.status || "待執行",
    completion: params.status === "已完成" ? (params.completion || "") : "",
    attachment: params.attachment,
    note: params.note,
  }, timestamp);

  return { caseId, updatedAt: timestamp };
}

function editCaseTracking_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const caseSheet = ensureSheet_(spreadsheet, SHEETS.cases, CASE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const caseRow = findCaseRow_(caseSheet, params.caseId);
  if (!caseRow) throw new Error("找不到案件ID：" + params.caseId);

  const headers = caseSheet.getRange(1, 1, 1, caseSheet.getLastColumn()).getValues()[0];
  const history = buildModificationContext_(spreadsheet, SHEETS.cases, params.caseId, params.reporter, timestamp, "editCaseTracking");
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "案件名稱", params.title || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "指定同事", params.assignee || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "交辦內容", params.instruction || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "查核點", params.checkpoint || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "Deadline", params.deadline || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "目前進度說明", params.progress || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "狀態", params.status || "待執行", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "優先序", params.priority || "一般", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "回報人", params.reporter || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "備註", params.note || "", history);
  setByHeaderWithHistory_(caseSheet, headers, caseRow, "佐證資料連結", params.attachment || "", history);
  if (params.status === "已完成") {
    const completion = getByHeader_(caseSheet, headers, caseRow, "完成/解除列管說明") || params.completion || params.progress || "";
    setByHeaderWithHistory_(caseSheet, headers, caseRow, "完成/解除列管說明", completion, history);
    if (!getByHeader_(caseSheet, headers, caseRow, "解除列管時間")) {
      setByHeaderWithHistory_(caseSheet, headers, caseRow, "解除列管時間", timestamp, history);
    }
  }
  setByHeader_(caseSheet, headers, caseRow, "最後修改人", params.reporter || "");
  setByHeader_(caseSheet, headers, caseRow, "最後修改時間", timestamp);

  return { caseId: params.caseId, modifiedAt: timestamp };
}

function submitCaseProgress_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const caseSheet = ensureSheet_(spreadsheet, SHEETS.cases, CASE_HEADERS);
  const updateSheet = ensureSheet_(spreadsheet, SHEETS.caseUpdates, CASE_UPDATE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const caseRow = findCaseRow_(caseSheet, params.caseId);
  if (!caseRow) throw new Error("找不到案件ID：" + params.caseId);

  const caseHeaders = caseSheet.getRange(1, 1, 1, caseSheet.getLastColumn()).getValues()[0];
  setByHeader_(caseSheet, caseHeaders, caseRow, "目前進度說明", params.progress);
  setByHeader_(caseSheet, caseHeaders, caseRow, "狀態", params.status || "進行中");
  setByHeader_(caseSheet, caseHeaders, caseRow, "回報人", params.reporter);
  setByHeader_(caseSheet, caseHeaders, caseRow, "回報時間", timestamp);
  if (params.note) setByHeader_(caseSheet, caseHeaders, caseRow, "備註", params.note);
  if (params.attachment) setByHeader_(caseSheet, caseHeaders, caseRow, "佐證資料連結", params.attachment);
  if (params.status === "已完成") {
    setByHeader_(caseSheet, caseHeaders, caseRow, "完成/解除列管說明", params.completion || params.progress || "");
    setByHeader_(caseSheet, caseHeaders, caseRow, "解除列管時間", timestamp);
  }

  appendCaseUpdate_(updateSheet, params, timestamp);

  return { caseId: params.caseId, updatedAt: timestamp };
}

function editCaseProgress_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const caseSheet = ensureSheet_(spreadsheet, SHEETS.cases, CASE_HEADERS);
  const updateSheet = ensureSheet_(spreadsheet, SHEETS.caseUpdates, CASE_UPDATE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const updateRow = findCaseUpdateRow_(updateSheet, params.updateId);
  if (!updateRow) throw new Error("找不到案件更新ID：" + params.updateId);

  const updateHeaders = updateSheet.getRange(1, 1, 1, updateSheet.getLastColumn()).getValues()[0];
  const originalCaseId = getByHeader_(updateSheet, updateHeaders, updateRow, "案件ID") || params.caseId || "";
  const updateHistory = buildModificationContext_(spreadsheet, SHEETS.caseUpdates, params.updateId, params.reporter, timestamp, "editCaseProgress");
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "案件ID", originalCaseId, updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "回報人", params.reporter || "", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "最新進度", params.progress || "", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "狀態", params.status || "進行中", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "完成/解除列管說明", params.completion || "", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "佐證資料連結", params.attachment || "", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "備註", params.note || "", updateHistory);
  setByHeader_(updateSheet, updateHeaders, updateRow, "最後修改人", params.reporter || "");
  setByHeader_(updateSheet, updateHeaders, updateRow, "最後修改時間", timestamp);

  if (originalCaseId && isLatestCaseUpdateRow_(updateSheet, updateHeaders, updateRow, originalCaseId)) {
    const caseRow = findCaseRow_(caseSheet, originalCaseId);
    if (caseRow) {
      const caseHeaders = caseSheet.getRange(1, 1, 1, caseSheet.getLastColumn()).getValues()[0];
      const caseHistory = buildModificationContext_(spreadsheet, SHEETS.cases, originalCaseId, params.reporter, timestamp, "editCaseProgress:latestCaseSync");
      setByHeaderWithHistory_(caseSheet, caseHeaders, caseRow, "目前進度說明", params.progress || "", caseHistory);
      setByHeaderWithHistory_(caseSheet, caseHeaders, caseRow, "狀態", params.status || "進行中", caseHistory);
      setByHeaderWithHistory_(caseSheet, caseHeaders, caseRow, "回報人", params.reporter || "", caseHistory);
      if (params.note) setByHeaderWithHistory_(caseSheet, caseHeaders, caseRow, "備註", params.note, caseHistory);
      if (params.attachment) setByHeaderWithHistory_(caseSheet, caseHeaders, caseRow, "佐證資料連結", params.attachment, caseHistory);
      if (params.status === "已完成") {
        setByHeaderWithHistory_(caseSheet, caseHeaders, caseRow, "完成/解除列管說明", params.completion || params.progress || "", caseHistory);
        if (!getByHeader_(caseSheet, caseHeaders, caseRow, "解除列管時間")) {
          setByHeaderWithHistory_(caseSheet, caseHeaders, caseRow, "解除列管時間", timestamp, caseHistory);
        }
      }
      setByHeader_(caseSheet, caseHeaders, caseRow, "最後修改人", params.reporter || "");
      setByHeader_(caseSheet, caseHeaders, caseRow, "最後修改時間", timestamp);
    }
  }

  return { updateId: params.updateId, caseId: originalCaseId, modifiedAt: timestamp };
}

function appendCaseUpdate_(sheet, params, timestamp) {
  const updateId = "CASE-UPD" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMddHHmmss");
  sheet.appendRow([
    updateId,
    params.caseId || "",
    timestamp.slice(0, 10),
    params.reporter || "",
    params.progress || "",
    params.status || "進行中",
    params.completion || "",
    params.attachment || "",
    params.note || "",
    "",
    "",
  ]);
}

function submitItemProgress_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const itemSheet = getItemSheet_(spreadsheet);
  const updateSheet = ensureSheet_(spreadsheet, SHEETS.updates, UPDATE_HEADERS);
  const expenseSheet = ensureSheet_(spreadsheet, SHEETS.expenses, EXPENSE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

  const itemRow = findItemRow_(itemSheet, params.itemId);
  if (!itemRow) throw new Error("找不到工項ID：" + params.itemId);

  const itemHeaders = itemSheet.getRange(1, 1, 1, itemSheet.getLastColumn()).getValues()[0];
  setScheduleSummary_(itemSheet, itemHeaders, itemRow, params.scheduleSummary || "");
  setByHeader_(itemSheet, itemHeaders, itemRow, "執行現況說明", params.progress);
  setByHeader_(itemSheet, itemHeaders, itemRow, "最後更新人", params.reporter);
  setByHeader_(itemSheet, itemHeaders, itemRow, "最後更新時間", timestamp);

  const updateId = "UPD" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMddHHmmss");
  updateSheet.appendRow([
    updateId,
    "",
    params.itemId,
    timestamp.slice(0, 10),
    params.reporter,
    params.progress,
    params.status || "未確認",
    params.nextDate || "",
    params.note || "",
    params.voucher || "",
    "",
    "",
  ]);

  if (Number(params.expense) > 0 || params.expenseDetail) {
    const expenseId = "EXP" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMddHHmmss");
    expenseSheet.appendRow([
      expenseId,
      "",
      params.itemId,
      params.itemName || "",
      Number(params.expense) || 0,
      params.expenseDetail || "",
      timestamp.slice(0, 10),
      params.reporter,
      params.voucher || "",
      params.note || "",
    ]);
  }

  return { itemId: params.itemId, updatedAt: timestamp };
}

function editItemProgress_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const itemSheet = getItemSheet_(spreadsheet);
  const updateSheet = ensureSheet_(spreadsheet, SHEETS.updates, UPDATE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const updateRow = findUpdateRow_(updateSheet, params.updateId);
  if (!updateRow) throw new Error("找不到更新ID：" + params.updateId);

  const updateHeaders = updateSheet.getRange(1, 1, 1, updateSheet.getLastColumn()).getValues()[0];
  const originalItemId = getByHeader_(updateSheet, updateHeaders, updateRow, "工項ID") || params.itemId || "";
  const updateHistory = buildModificationContext_(spreadsheet, SHEETS.updates, params.updateId, params.reporter, timestamp, "editItemProgress");
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "工項ID", originalItemId, updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "進度內容", params.progress, updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "完成狀態", params.status || "未確認", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "下次追蹤日期", params.nextDate || "", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "備註", params.note || "", updateHistory);
  setByHeaderWithHistory_(updateSheet, updateHeaders, updateRow, "佐證資料連結", params.voucher || "", updateHistory);
  setByHeader_(updateSheet, updateHeaders, updateRow, "最後修改人", params.reporter || "");
  setByHeader_(updateSheet, updateHeaders, updateRow, "最後修改時間", timestamp);

  if (itemSheet && originalItemId && isLatestItemUpdateRow_(updateSheet, updateHeaders, updateRow, originalItemId)) {
    const itemRow = findItemRow_(itemSheet, originalItemId);
    if (itemRow) {
      const itemHeaders = itemSheet.getRange(1, 1, 1, itemSheet.getLastColumn()).getValues()[0];
      const itemHistory = buildModificationContext_(spreadsheet, itemSheet.getName(), originalItemId, params.reporter, timestamp, "editItemProgress:latestItemSync");
      setScheduleSummaryWithHistory_(itemSheet, itemHeaders, itemRow, params.scheduleSummary || "", itemHistory);
      setByHeaderWithHistory_(itemSheet, itemHeaders, itemRow, "執行現況說明", params.progress, itemHistory);
    }
  }

  return { updateId: params.updateId, itemId: originalItemId, modifiedAt: timestamp };
}

function getItemSheet_(spreadsheet) {
  return spreadsheet.getSheetByName("資料總覽")
    || spreadsheet.getSheetByName("工項主檔")
    || spreadsheet.getSheetByName("工項總表");
}

function setScheduleSummary_(sheet, headers, row, value) {
  const index = headers.indexOf("表定時間摘要");
  if (index >= 0) {
    sheet.getRange(row, index + 1).setValue(value);
    return;
  }
  sheet.getRange(row, 8).setValue(value);
}

function setScheduleSummaryWithHistory_(sheet, headers, row, value, history) {
  const index = headers.indexOf("表定時間摘要");
  if (index >= 0) {
    setByHeaderWithHistory_(sheet, headers, row, "表定時間摘要", value, history);
    return;
  }
  setCellWithHistory_(sheet, row, 8, "表定時間摘要", value, history);
}

function listTasks_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.tasks);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row[0])
    .map((row) => {
      const record = rowToObject_(headers, row);
      return {
        taskId: record["任務ID"],
        itemId: record["工項ID"],
        sourceSheet: record["來源工作表"],
        itemName: record["工項名稱"],
        taskName: record["工作細項"],
        month: record["執行月份"],
        progress: record["目前工作進度"],
        budget: record["核定經費"],
        owner: record["負責同仁"],
        dueDate: record["預定完成日期"],
        status: record["是否完成"] || "未確認",
        expense: record["費用"] || "0",
        expenseDetail: record["費用明細"],
        note: record["備註"],
        updatedBy: record["最後更新人"],
        updatedAt: record["最後更新時間"],
      };
    });
}

function submitProgress_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const taskSheet = spreadsheet.getSheetByName(SHEETS.tasks);
  const updateSheet = ensureSheet_(spreadsheet, SHEETS.updates, UPDATE_HEADERS);
  const expenseSheet = ensureSheet_(spreadsheet, SHEETS.expenses, EXPENSE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

  const taskRow = findTaskRow_(taskSheet, params.taskId);
  if (!taskRow) throw new Error("找不到任務ID：" + params.taskId);

  const taskHeaders = taskSheet.getRange(1, 1, 1, taskSheet.getLastColumn()).getValues()[0];
  setByHeader_(taskSheet, taskHeaders, taskRow, "目前工作進度", params.progress);
  setByHeader_(taskSheet, taskHeaders, taskRow, "是否完成", params.status || "未確認");
  setByHeader_(taskSheet, taskHeaders, taskRow, "最後更新人", params.reporter);
  setByHeader_(taskSheet, taskHeaders, taskRow, "最後更新時間", timestamp);
  if (params.note) setByHeader_(taskSheet, taskHeaders, taskRow, "備註", params.note);
  if (params.expense) {
    const currentExpense = Number(getByHeader_(taskSheet, taskHeaders, taskRow, "費用")) || 0;
    const nextExpense = currentExpense + (Number(params.expense) || 0);
    setByHeader_(taskSheet, taskHeaders, taskRow, "費用", nextExpense);
  }
  if (params.expenseDetail) {
    setByHeader_(taskSheet, taskHeaders, taskRow, "費用明細", params.expenseDetail);
  }

  const updateId = "UPD" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMddHHmmss");
  updateSheet.appendRow([
    updateId,
    params.taskId,
    params.itemId,
    timestamp.slice(0, 10),
    params.reporter,
    params.progress,
    params.status || "未確認",
    params.nextDate || "",
    params.note || "",
    params.voucher || "",
    "",
    "",
  ]);

  if (Number(params.expense) > 0 || params.expenseDetail) {
    const expenseId = "EXP" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMddHHmmss");
    expenseSheet.appendRow([
      expenseId,
      params.taskId,
      params.itemId,
      params.itemName || "",
      Number(params.expense) || 0,
      params.expenseDetail || "",
      timestamp.slice(0, 10),
      params.reporter,
      params.voucher || "",
      params.note || "",
    ]);
  }

  return { taskId: params.taskId, updatedAt: timestamp };
}

function findTaskRow_(sheet, taskId) {
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === taskId) return i + 1;
  }
  return 0;
}

function findUpdateRow_(sheet, updateId) {
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getDisplayValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === updateId) return i + 1;
  }
  return 0;
}

function isLatestItemUpdateRow_(sheet, headers, targetRow, itemId) {
  const itemIdIndex = headers.indexOf("工項ID");
  if (itemIdIndex < 0) return true;
  const lastRow = sheet.getLastRow();
  for (let row = lastRow; row >= 2; row--) {
    const currentItemId = sheet.getRange(row, itemIdIndex + 1).getDisplayValue();
    if (currentItemId === itemId) return row === targetRow;
  }
  return true;
}

function findItemRow_(sheet, itemId) {
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === itemId) return i + 1;
  }
  return 0;
}

function findCaseRow_(sheet, caseId) {
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getDisplayValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === caseId) return i + 1;
  }
  return 0;
}

function findCaseUpdateRow_(sheet, updateId) {
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getDisplayValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === updateId) return i + 1;
  }
  return 0;
}

function isLatestCaseUpdateRow_(sheet, headers, targetRow, caseId) {
  const caseIdIndex = headers.indexOf("案件ID");
  if (caseIdIndex < 0) return true;
  const lastRow = sheet.getLastRow();
  for (let row = lastRow; row >= 2; row--) {
    const currentCaseId = sheet.getRange(row, caseIdIndex + 1).getDisplayValue();
    if (currentCaseId === caseId) return row === targetRow;
  }
  return true;
}

function findSessionRow_(sheet, sessionId) {
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getDisplayValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === sessionId) return i + 1;
  }
  return 0;
}

function nextCaseId_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "CASE-0001";
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  let maxSerial = 0;
  values.forEach((row) => {
    const match = String(row[0] || "").match(/^CASE-(\d+)$/);
    if (match) maxSerial = Math.max(maxSerial, Number(match[1]));
  });
  const nextSerial = Math.max(maxSerial, values.length) + 1;
  return "CASE-" + String(nextSerial).padStart(4, "0");
}

function nextConsultationId_(sheet, month) {
  const normalizedMonth = String(month || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6) || Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMM");
  const prefix = "CONS-" + normalizedMonth + "-";
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return prefix + "001";
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  let maxSerial = 0;
  values.forEach((row) => {
    const value = String(row[0] || "");
    if (!value.startsWith(prefix)) return;
    const serial = Number(value.slice(prefix.length));
    if (Number.isFinite(serial)) maxSerial = Math.max(maxSerial, serial);
  });
  return prefix + String(maxSerial + 1).padStart(3, "0");
}

function rowToObject_(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = row[index] || "";
    return record;
  }, {});
}

function setByHeader_(sheet, headers, row, header, value) {
  const index = headers.indexOf(header);
  if (index >= 0) sheet.getRange(row, index + 1).setValue(value);
}

function setByHeaderWithHistory_(sheet, headers, row, header, value, history) {
  const index = headers.indexOf(header);
  if (index < 0) return;
  setCellWithHistory_(sheet, row, index + 1, header, value, history);
}

function setCellWithHistory_(sheet, row, column, header, value, history) {
  const range = sheet.getRange(row, column);
  const oldValue = range.getDisplayValue();
  const newValue = normalizeHistoryValue_(value);
  if (oldValue === newValue) return;
  range.setValue(value);
  appendModificationHistory_(history, header, oldValue, newValue);
}

function buildModificationContext_(spreadsheet, sheetName, recordId, reporter, timestamp, source) {
  return {
    spreadsheet,
    sheetName,
    recordId: recordId || "",
    reporter: reporter || "",
    timestamp,
    source,
  };
}

function appendModificationHistory_(history, field, oldValue, newValue) {
  const sheet = ensureSheet_(history.spreadsheet, SHEETS.modificationHistory, MODIFICATION_HISTORY_HEADERS);
  const historyId = "MOD" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMddHHmmss") + "-" + Utilities.getUuid().slice(0, 8);
  sheet.appendRow([
    historyId,
    history.sheetName,
    history.recordId,
    field,
    oldValue,
    newValue,
    history.reporter,
    history.timestamp,
    history.source,
  ]);
}

function normalizeHistoryValue_(value) {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
}

function getByHeader_(sheet, headers, row, header) {
  const index = headers.indexOf(header);
  if (index < 0) return "";
  return sheet.getRange(row, index + 1).getValue();
}

function checkReporter_(reporter) {
  if (!ALLOWED_REPORTERS.length) return;
  if (ALLOWED_REPORTERS.indexOf(reporter || "") < 0) {
    throw new Error("填報人不在允許名單中");
  }
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  let currentHeaders = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
    : [];
  const hasAnyHeader = currentHeaders.some((header) => header);
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  const missingHeaders = headers.filter((header) => currentHeaders.indexOf(header) < 0);
  if (missingHeaders.length) {
    const startColumn = currentHeaders.filter((header) => header).length + 1;
    sheet.getRange(1, startColumn, 1, missingHeaders.length).setValues([missingHeaders]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function parsePost_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents && e.postData.type === "application/json") {
    return JSON.parse(e.postData.contents);
  }
  return e.parameter || {};
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, payload) {
  const body = callback
    ? `${callback}(${JSON.stringify(payload)});`
    : JSON.stringify(payload);
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
