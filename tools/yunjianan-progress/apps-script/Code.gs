const SPREADSHEET_ID = "1jF8XdfhtbOI22kJ0GbAU69-NuWHQLAgHLQMIhhynSF0";
const SHEETS = {
  tasks: "任務明細",
  updates: "進度更新紀錄",
  expenses: "經費支出紀錄",
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
    return jsonp_(params.callback, { ok: false, error: "Unknown action" });
  } catch (error) {
    return jsonp_(params.callback, { ok: false, error: error.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const params = parsePost_(e);
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
