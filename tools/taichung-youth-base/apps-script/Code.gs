const DRIVE_ROOT_ID = "0AN_42cvSSGfMUk9PVA";
const EVIDENCE_FOLDER_ID = "114qmRGC4XnNNkQF0dnKhTL4hgWTsh7L9";
const SPACE_REPORT_SPREADSHEET_ID = "1k7hU4dBymaM31XNDWD5fbiHOlHlF3Xjfxh0ooAgvTaA";
const DASHBOARD_SOURCES = [
  {
    name: "青創基地每週空間回報",
    id: "1k7hU4dBymaM31XNDWD5fbiHOlHlF3Xjfxh0ooAgvTaA",
    type: "Google Sheet",
    url: "https://docs.google.com/spreadsheets/d/1k7hU4dBymaM31XNDWD5fbiHOlHlF3Xjfxh0ooAgvTaA/edit",
    sensitive: false,
  },
  {
    name: "勞工局新創基地_工作執行進度表.xlsx",
    id: "1te31KWIfonRdR-zBQcC-ejfIr5hYWeli",
    type: "Excel",
    url: "https://docs.google.com/spreadsheets/d/1te31KWIfonRdR-zBQcC-ejfIr5hYWeli/edit",
    sensitive: false,
  },
  {
    name: "摘星計畫區房舍修繕費用統計表.xlsx",
    id: "1pEacGjwdO_esmTOr2MuALYuUOEz7MHFE",
    type: "Excel",
    url: "https://docs.google.com/spreadsheets/d/1pEacGjwdO_esmTOr2MuALYuUOEz7MHFE/edit",
    sensitive: false,
  },
  {
    name: "成果報告資料整理",
    id: EVIDENCE_FOLDER_ID,
    type: "Drive Folder",
    url: "https://drive.google.com/drive/folders/114qmRGC4XnNNkQF0dnKhTL4hgWTsh7L9",
    sensitive: false,
  },
  {
    name: "3. 交接相關電子檔（處理中）",
    id: "16xbWyxkGhHFMsavvcotPxvZjR_dWLvTi",
    type: "Drive Folder",
    url: "https://drive.google.com/drive/folders/16xbWyxkGhHFMsavvcotPxvZjR_dWLvTi",
    sensitive: true,
  },
  {
    name: "115年第一次進駐店家",
    id: "1eojhF0KnfaTRFr70ZMaoBD2sWsoUrcNO",
    type: "Drive Folder",
    url: "https://drive.google.com/drive/folders/1eojhF0KnfaTRFr70ZMaoBD2sWsoUrcNO",
    sensitive: true,
  },
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  try {
    if ((params.action || "listData") === "health") {
      return jsonp_(params.callback, { ok: true, message: "ok" });
    }
    return jsonp_(params.callback, listData_());
  } catch (error) {
    return jsonp_(params.callback, { ok: false, error: error.message });
  }
}

function listData_() {
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sources: listDashboardSources_(),
    evidenceCategories: listEvidenceCategories_(),
    spaceReport: readSpaceReport_(),
  };
}

function listDashboardSources_() {
  return DASHBOARD_SOURCES.map((source) => {
    const file = DriveApp.getFileById(source.id);
    return {
      name: source.name,
      type: source.type,
      url: source.url,
      modifiedTime: file.getLastUpdated().toISOString(),
      status: source.sensitive ? "risk" : classifyByAge_(file.getLastUpdated(), 14, 45),
      note: source.sensitive
        ? "此來源含個資或敏感附件，前端只回傳摘要欄位。"
        : "由 Apps Script 讀取 Drive 更新時間。",
    };
  });
}

function listEvidenceCategories_() {
  const folder = DriveApp.getFolderById(EVIDENCE_FOLDER_ID);
  const folders = folder.getFolders();
  const rows = [];
  while (folders.hasNext()) {
    const child = folders.next();
    rows.push({
      name: child.getName(),
      status: classifyByAge_(child.getLastUpdated(), 35, 70),
      note: "依子資料夾最近更新時間判斷是否需檢查本月佐證。",
      modifiedTime: child.getLastUpdated().toISOString(),
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  return rows;
}

function readSpaceReport_() {
  const fallback = {
    week: "",
    nextDue: "",
    guangfu: {},
    shenji: {},
    total: {},
  };
  try {
    const spreadsheet = SpreadsheetApp.openById(SPACE_REPORT_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheets()[0];
    const values = sheet.getDataRange().getDisplayValues();
    const rows = values.slice(1).filter((row) => row[0]);
    const latest = rows.reverse().find((row) => row[1] || row[2] || row[3]) || [];
    const next = values.find((row) => row[0] && !row[1] && !row[2] && !row[3]) || [];
    return {
      week: latest[0] || "",
      nextDue: next[0] || "",
      guangfu: parseSpaceCell_(latest[1]),
      shenji: parseSpaceCell_(latest[2]),
      total: parseTotalCell_(latest[3], latest[4]),
    };
  } catch (error) {
    return fallback;
  }
}

function parseSpaceCell_(value) {
  const text = value || "";
  return {
    available: numberAfter_(text, "可進駐空間"),
    occupied: numberAfter_(text, "現進駐店家"),
    vacant: numberAfter_(text, "未進駐空間"),
    vacantUnits: (text.match(/未進駐空間[：:]\s*\d+\s*（(.+)）/) || [])[1] || "",
  };
}

function parseTotalCell_(spaceText, visitText) {
  return {
    occupied: numberAfter_(spaceText || "", "共計店家進駐"),
    vacant: numberAfter_(spaceText || "", "未進駐空間餘"),
    visits: visitText || "無",
  };
}

function numberAfter_(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(text).match(new RegExp(`${escaped}\\s*[：:]?\\s*(\\d+)`));
  return match ? Number(match[1]) : 0;
}

function classifyByAge_(date, watchDays, riskDays) {
  const ageMs = Date.now() - date.getTime();
  const ageDays = ageMs / 86400000;
  if (ageDays > riskDays) return "risk";
  if (ageDays > watchDays) return "watch";
  return "ok";
}

function jsonp_(callback, payload) {
  const output = callback
    ? `${callback}(${JSON.stringify(payload)})`
    : JSON.stringify(payload);
  return ContentService
    .createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
