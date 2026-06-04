const SPREADSHEET_ID = "1jF8XdfhtbOI22kJ0GbAU69-NuWHQLAgHLQMIhhynSF0";
const SHEETS = {
  tasks: "任務明細",
  updates: "進度更新紀錄",
  expenses: "經費支出紀錄",
  cases: "案件追蹤列管",
};

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
      const result = submitItemProgress_(params);
      return json_({ ok: true, result });
    }
    if (params.action === "submitCaseTracking") {
      const result = submitCaseTracking_(params);
      return json_({ ok: true, result });
    }
    if (params.action !== "submitProgress") {
      return json_({ ok: false, error: "Unknown action" });
    }
    const result = submitProgress_(params);
    return json_({ ok: true, result });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function submitCaseTracking_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const caseSheet = ensureSheet_(spreadsheet, SHEETS.cases, [
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
  ]);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
  const caseId = "CASE" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMddHHmmss");

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
  ]);

  return { caseId, updatedAt: timestamp };
}

function submitItemProgress_(params) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const itemSheet = spreadsheet.getSheetByName("工項主檔") || spreadsheet.getSheetByName("工項總表");
  const updateSheet = spreadsheet.getSheetByName(SHEETS.updates);
  const expenseSheet = spreadsheet.getSheetByName(SHEETS.expenses);
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
      "",
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
  const updateSheet = spreadsheet.getSheetByName(SHEETS.updates);
  const expenseSheet = spreadsheet.getSheetByName(SHEETS.expenses);
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
      "",
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

function ensureSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  const currentHeaders = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
    : [];
  const hasHeaders = headers.every((header, index) => currentHeaders[index] === header);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
