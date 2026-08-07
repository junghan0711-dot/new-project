const DRIVE_ROOT_ID = "0AN_42cvSSGfMUk9PVA";
const EVIDENCE_FOLDER_ID = "114qmRGC4XnNNkQF0dnKhTL4hgWTsh7L9";
const SPACE_REPORT_SPREADSHEET_ID = "1k7hU4dBymaM31XNDWD5fbiHOlHlF3Xjfxh0ooAgvTaA";
const BASE_EVIDENCE_FOCUS = {
  guangfu: [
    "08光復新村庭院空間使用審查申請",
    "09光復新村體驗教室使用審查",
    "19光復新村遊客滿意度調查",
    "20清潔紀錄",
    "21保全紀錄",
    "22光復新村全區消毒、除草紀錄",
    "23清潔、保全工作日誌",
  ],
  shenji: [
    "01巡視紀錄",
    "06訪視紀錄表",
    "11會議記錄審核證明",
    "12青年進駐管理情形表",
    "13青創基地修繕項目",
    "16競爭型獎勵補助申請彙整",
  ],
};
const DASHBOARD_SOURCES = [
  {
    name: "勞工局契約書_內容+頁碼_v2",
    id: "1NUn3uuM5y4Qent2MwA6jAB3QA59Sd9JH9EFyXi6UP4M",
    type: "Google Doc / PDF",
    url: "https://docs.google.com/document/d/1NUn3uuM5y4Qent2MwA6jAB3QA59Sd9JH9EFyXi6UP4M/edit",
    sensitive: false,
    base: "shared",
  },
  {
    name: "青創基地每週空間回報",
    id: "1k7hU4dBymaM31XNDWD5fbiHOlHlF3Xjfxh0ooAgvTaA",
    type: "Google Sheet",
    url: "https://docs.google.com/spreadsheets/d/1k7hU4dBymaM31XNDWD5fbiHOlHlF3Xjfxh0ooAgvTaA/edit",
    sensitive: false,
    base: "shared",
  },
  {
    name: "勞工局新創基地_工作執行進度表.xlsx",
    id: "1te31KWIfonRdR-zBQcC-ejfIr5hYWeli",
    type: "Excel",
    url: "https://docs.google.com/spreadsheets/d/1te31KWIfonRdR-zBQcC-ejfIr5hYWeli/edit",
    sensitive: false,
    base: "shared",
  },
  {
    name: "摘星計畫區房舍修繕費用統計表.xlsx",
    id: "1SY5I6GRwkzCrsHTXso3PS1UXRtqn1SMo",
    type: "Excel",
    url: "https://docs.google.com/spreadsheets/d/1SY5I6GRwkzCrsHTXso3PS1UXRtqn1SMo/edit",
    sensitive: false,
    base: "shared",
  },
  {
    name: "光復新村街頭藝人演出申請表",
    id: "1Xc5cQpjZzaOrda2rhsa9RQ0p48p4Yd-nz_d_Jtbel34",
    type: "Google Form",
    url: "https://docs.google.com/forms/d/1Xc5cQpjZzaOrda2rhsa9RQ0p48p4Yd-nz_d_Jtbel34/edit",
    sensitive: false,
    base: "guangfu",
  },
  {
    name: "光復新村街頭藝人演出申請表 (回覆)",
    id: "1K1NMdTd1iQAvo_KGalh7YiYRK4feSvuefSwgat8ROAo",
    type: "Google Sheet",
    url: "https://docs.google.com/spreadsheets/d/1K1NMdTd1iQAvo_KGalh7YiYRK4feSvuefSwgat8ROAo/edit",
    sensitive: false,
    base: "guangfu",
  },
  {
    name: "審查會相關",
    id: "1YEdKIFfwVk5VSv7XgHEO9dTxdkfXkFWZ",
    type: "Drive Folder",
    url: "https://drive.google.com/drive/folders/1YEdKIFfwVk5VSv7XgHEO9dTxdkfXkFWZ",
    sensitive: false,
    base: "shenji",
  },
  {
    name: "成果報告資料整理",
    id: EVIDENCE_FOLDER_ID,
    type: "Drive Folder",
    url: "https://drive.google.com/drive/folders/114qmRGC4XnNNkQF0dnKhTL4hgWTsh7L9",
    sensitive: false,
    base: "shared",
  },
  {
    name: "3. 交接相關電子檔（處理中）",
    id: "16xbWyxkGhHFMsavvcotPxvZjR_dWLvTi",
    type: "Drive Folder",
    url: "https://drive.google.com/drive/folders/16xbWyxkGhHFMsavvcotPxvZjR_dWLvTi",
    sensitive: true,
    base: "shared",
  },
  {
    name: "115年第一次進駐店家",
    id: "1eojhF0KnfaTRFr70ZMaoBD2sWsoUrcNO",
    type: "Drive Folder",
    url: "https://drive.google.com/drive/folders/1eojhF0KnfaTRFr70ZMaoBD2sWsoUrcNO",
    sensitive: true,
    base: "guangfu",
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
  const sources = listDashboardSources_();
  const evidenceCategories = listEvidenceCategories_();
  const spaceReport = readSpaceReport_();
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sources: sources,
    evidenceCategories: evidenceCategories,
    spaceReport: spaceReport,
    baseOverview: buildBaseOverview_(sources, evidenceCategories, spaceReport),
  };
}

function authorize() {
  return authorize_();
}

function authorize_() {
  const root = DriveApp.getFolderById(DRIVE_ROOT_ID);
  const evidence = DriveApp.getFolderById(EVIDENCE_FOLDER_ID);
  const spreadsheet = SpreadsheetApp.openById(SPACE_REPORT_SPREADSHEET_ID);
  return {
    ok: true,
    driveRootName: root.getName(),
    evidenceFolderName: evidence.getName(),
    spaceReportName: spreadsheet.getName(),
  };
}

function listDashboardSources_() {
  return DASHBOARD_SOURCES.map((source) => {
    const updated = getDriveItemUpdated_(source.id);
    return {
      name: source.name,
      type: source.type,
      url: source.url,
      base: source.base || classifyBase_(source.name),
      modifiedTime: updated.toISOString(),
      status: source.sensitive ? "risk" : classifyByAge_(updated, 14, 45),
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
      base: classifyBase_(child.getName()),
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
    const latestIndex = findLatestSpaceRowIndex_(rows);
    const latest = latestIndex >= 0 ? rows[latestIndex] : [];
    const next = rows.slice(latestIndex + 1).find((row) => parseSpaceWeekDate_(row[0])) || [];
    const guangfuText = latestIndex >= 0 ? resolveSpaceValue_(rows, latestIndex, 1, {}) : "";
    const shenjiText = latestIndex >= 0 ? resolveSpaceValue_(rows, latestIndex, 2, {}) : "";
    const totalText = latestIndex >= 0 ? resolveSpaceValue_(rows, latestIndex, 3, {}) : "";
    const visitText = latestIndex >= 0 ? resolveSpaceValue_(rows, latestIndex, 4, {}) : "";
    return {
      week: latest[0] || "",
      nextDue: next[0] || "",
      guangfu: Object.assign(parseSpaceCell_(guangfuText), { visits: parseVisitByBase_(visitText, "光復新村") }),
      shenji: Object.assign(parseSpaceCell_(shenjiText), { visits: parseVisitByBase_(visitText, "審計新村") }),
      total: parseTotalCell_(totalText, visitText),
    };
  } catch (error) {
    fallback.error = error.message;
    return fallback;
  }
}

function buildBaseOverview_(sources, evidenceCategories, spaceReport) {
  return [
    {
      id: "guangfu",
      name: "光復新村",
      status: "watch",
      summary: "光復新村涵蓋進駐、街頭藝人、借用審查、滿意度、保全、清潔、消毒除草與多數修繕，需獨立追蹤月報佐證。",
      spaceKey: "guangfu",
      contractFocus: ["OPS-01", "MTG-02", "VIS-01", "SEC-01", "CLN-01"],
      sourceFocus: sources.filter((source) => source.base === "guangfu" || source.name === "青創基地每週空間回報"),
      evidenceFocus: BASE_EVIDENCE_FOCUS.guangfu.filter((name) => evidenceCategories.some((item) => item.name === name)),
      nextChecks: [
        `最新空間週次 ${spaceReport.week || "-"}；下次回報 ${spaceReport.nextDue || "-"}`,
        "保全、清潔、消毒除草及光復專屬空間借用需逐月檢核。",
        "含個資附件只保留在 Drive 權限內，前端顯示去識別摘要。",
      ],
    },
    {
      id: "shenji",
      name: "審計新村",
      status: "watch",
      summary: "審計新村重點在每週空間回報、查訪營運、進離駐、審查會與青年座談追蹤，需和光復分列。",
      spaceKey: "shenji",
      contractFocus: ["OPS-01", "MTG-02", "MKT-01", "MKT-02"],
      sourceFocus: sources.filter((source) => source.base === "shenji" || source.name === "青創基地每週空間回報"),
      evidenceFocus: BASE_EVIDENCE_FOCUS.shenji.filter((name) => evidenceCategories.some((item) => item.name === name)),
      nextChecks: [
        `最新空間週次 ${spaceReport.week || "-"}；下次回報 ${spaceReport.nextDue || "-"}`,
        "審查會決議需回扣進駐、空間變更與營運未達標清冊。",
        "青年座談會需與光復各自保留議程、簽到、紀錄與追蹤列管。",
      ],
    },
  ];
}

function getDriveItemUpdated_(id) {
  try {
    return DriveApp.getFileById(id).getLastUpdated();
  } catch (fileError) {
    return DriveApp.getFolderById(id).getLastUpdated();
  }
}

function classifyBase_(name) {
  const text = String(name || "");
  if (text.indexOf("光復") !== -1 || text.indexOf("保全") !== -1 || text.indexOf("清潔") !== -1 || text.indexOf("消毒") !== -1 || text.indexOf("除草") !== -1) return "guangfu";
  if (text.indexOf("審計") !== -1 || text.indexOf("審查會") !== -1) return "shenji";
  return "shared";
}

function findLatestSpaceRowIndex_(rows) {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (!rows[i][0]) continue;
    const weekDate = parseSpaceWeekDate_(rows[i][0]);
    if (!weekDate || weekDate.getTime() > endOfToday.getTime()) continue;
    const guangfu = parseSpaceCell_(resolveSpaceValue_(rows, i, 1, {}));
    const shenji = parseSpaceCell_(resolveSpaceValue_(rows, i, 2, {}));
    if (guangfu.available || guangfu.occupied || shenji.available || shenji.occupied) return i;
  }
  return -1;
}

function parseSpaceWeekDate_(value) {
  const token = normalizeDateToken_(value);
  if (!token) return null;
  const parts = token.split("/").map(Number);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const date = new Date(new Date().getFullYear(), parts[0] - 1, parts[1]);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveSpaceValue_(rows, index, column, seen) {
  const value = rows[index] && rows[index][column] ? rows[index][column] : "";
  const match = String(value).match(/與\s*([0-9０-９]+[／/][0-9０-９]+)\s*同/);
  if (!match) return value;
  const target = normalizeDateToken_(match[1]);
  if (seen[target]) return value;
  seen[target] = true;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (normalizeDateToken_(rows[i][0]) === target) {
      return resolveSpaceValue_(rows, i, column, seen);
    }
  }
  return value;
}

function normalizeDateToken_(value) {
  const full = "０１２３４５６７８９";
  const match = String(value || "")
    .replace(/[０-９]/g, (char) => String(full.indexOf(char)))
    .replace("／", "/")
    .match(/\d+\/\d+/);
  return match ? match[0] : "";
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

function parseVisitByBase_(text, baseName) {
  const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(text || "").match(new RegExp(`${escaped}\\s*[：:]\\s*([^\\r\\n]+)`));
  return match ? match[1].trim() : "無";
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
