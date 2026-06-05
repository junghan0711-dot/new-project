const SPREADSHEET_ID = "1jF8XdfhtbOI22kJ0GbAU69-NuWHQLAgHLQMIhhynSF0";
const SHEETS = {
  tasks: "任務明細",
  updates: "進度更新紀錄",
  expenses: "經費支出紀錄",
  cases: "案件追蹤列管",
  caseUpdates: "案件進度紀錄",
  consultations: "諮詢輔導場次",
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
  const sheet = spreadsheet.getSheetByName("工項主檔") || spreadsheet.getSheetByName("工項總表");
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
        owner: record["主責及協辦"],
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
    if (params.action === "submitCaseTracking") {
      checkReporter_(params.reporter);
      const result = submitCaseTracking_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "submitCaseProgress") {
      checkReporter_(params.reporter);
      const result = submitCaseProgress_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "submitConsultationSession") {
      checkReporter_(params.reporter);
      const result = submitConsultationSession_(params);
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
  ]);

  return { sessionId, updatedAt: timestamp };
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
  ]);
}

function submitItemProgress_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const itemSheet = spreadsheet.getSheetByName("工項主檔") || spreadsheet.getSheetByName("工項總表");
  const updateSheet = ensureSheet_(spreadsheet, SHEETS.updates, UPDATE_HEADERS);
  const expenseSheet = ensureSheet_(spreadsheet, SHEETS.expenses, EXPENSE_HEADERS);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");

  const itemRow = findItemRow_(itemSheet, params.itemId);
  if (!itemRow) throw new Error("找不到工項ID：" + params.itemId);

  const itemHeaders = itemSheet.getRange(1, 1, 1, itemSheet.getLastColumn()).getValues()[0];
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
