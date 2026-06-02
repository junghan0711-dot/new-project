import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/junghanchiu/Documents/New project/outputs/新竹縣地方創生計畫金額彙整";
const outputPath = `${outputDir}/新竹縣地方創生計畫金額彙整.xlsx`;

const workbook = Workbook.create();
const summary = workbook.worksheets.getOrAdd("摘要統計", { renameFirstIfOnlyNewSpreadsheet: true });
const detail = workbook.worksheets.add("案件明細");
const ministry = workbook.worksheets.add("部會金額明細");
const notes = workbook.worksheets.add("資料口徑");

for (const sheet of [summary, detail, ministry, notes]) {
  sheet.showGridLines = false;
}

const cases = [
  {
    year: 112,
    actualYearNote: "公開資料顯示主案於109年進入第14次工作會議；原表列112作為案例年度。",
    name: "新竹縣峨眉鄉地方創生計畫",
    township: "峨眉鄉",
    status: "國發會相關地方創生案例／第14次工作會議公開資料",
    sourceNature: "公開推估／媒合經費",
    publicSubsidy: 68208000,
    proposalCentral: 68208000,
    proposalLocal: 5000000,
    proposalPrivate: 36192000,
    proposalTotal: 109400000,
    completeness: "總額約數",
    note: "縣府新聞寫中央部會經費6820.8萬元、民間投資3619.2萬元、地方自籌近500萬元；非逐項核定清冊。",
    source: "新竹縣府新聞；國發會新聞稿",
    sourceUrl: "https://information.hsinchu.gov.tw/News_Content.aspx?n=2203&s=225153；https://www.ndc.gov.tw/nc_8456_33731",
  },
  {
    year: 112,
    actualYearNote: "原表列112；公開PDF為地方創生計畫發展策略及經費需求表。",
    name: "新竹縣寶山鄉地方創生計畫",
    township: "寶山鄉",
    status: "國發會相關地方創生案例",
    sourceNature: "公開經費需求表",
    publicSubsidy: 5860000,
    proposalCentral: 5860000,
    proposalLocal: 0,
    proposalPrivate: 3000000,
    proposalTotal: 8860000,
    completeness: "總額已列示",
    note: "公開表列總經費需求886萬元，其中中央586萬元、民間投資300萬元。",
    source: "新竹縣府公開PDF",
    sourceUrl: "https://ws.hsinchu.gov.tw/Download.ashx?n=5a%2B25bGx6YSJ57aT6LK76ZyA5rGC6KGoLnBkZg%3D%3D&u=LzAwMS9VcGxvYWQvMTQvcmVsZmlsZS85NDk5LzIyOTQ1MC8yYjljMDgyNy0yYTFhLTQ0Y2MtYjYyNS1hNThkOWU4NzNhMTMucGRm",
  },
  {
    year: 114,
    actualYearNote: "第46次行政院地方創生會報工作會議通過。",
    name: "時光村生態產業升級計畫",
    township: "峨眉鄉",
    status: "第46次行政院地方創生會報工作會議通過",
    sourceNature: "會報列示中央補助／匡列上限",
    publicSubsidy: 5456290,
    proposalCentral: null,
    proposalLocal: null,
    proposalPrivate: null,
    proposalTotal: null,
    completeness: "僅補助／匡列",
    note: "會議紀錄列客委會100萬元上限、勞動部305.629萬元上限、經濟部140萬元；實際補助仍視各部會審查。",
    source: "第46次工作會議紀錄",
    sourceUrl: "https://gdd.hsinchu.gov.tw/News_Content.aspx?n=1212&s=267784&sms=9499",
  },
  {
    year: 114,
    actualYearNote: "第51次行政院地方創生會報工作會議通過。",
    name: "新竹縣五峰鄉地方創生計畫",
    township: "五峰鄉",
    status: "第51次行政院地方創生會報工作會議通過",
    sourceNature: "會報補助＋本機提案書總經費",
    publicSubsidy: 7343000,
    proposalCentral: 7844000,
    proposalLocal: 0,
    proposalPrivate: 2186000,
    proposalTotal: 10030000,
    completeness: "總額已列示",
    note: "會報補助合計734.3萬元；本機提案書總經費1003萬元，中央784.4萬元、民間218.6萬元，兩者需分開引用。",
    source: "國發會第51次通過頁；第51次會議紀錄；本機五峰提案書",
    sourceUrl: "https://www.ndc.gov.tw/nc_14813_39519",
  },
  {
    year: 115,
    actualYearNote: "第55次行政院地方創生會報工作會議通過。",
    name: "平論文地方創生計畫",
    township: "尖石鄉",
    status: "第55次行政院地方創生會報工作會議通過",
    sourceNature: "本機提案書經費需求",
    publicSubsidy: null,
    proposalCentral: 16543245,
    proposalLocal: 741751,
    proposalPrivate: 380000,
    proposalTotal: 17664996,
    completeness: "總額已列示",
    note: "第55次會議版提案書列總經費1766.4996萬元；公開國發會頁目前未列補助金額。",
    source: "國發會第55次通過頁；本機尖石1150318提案書",
    sourceUrl: "https://www.ndc.gov.tw/nc_14813_40035",
  },
];

const ministryRows = [
  ["新竹縣峨眉鄉地方創生計畫", "多部會合計", "公開資料未拆分", "中央部會經費", 68208000, 0, 0, "公開推估／媒合經費"],
  ["新竹縣寶山鄉地方創生計畫", "多部會合計", "公開資料未拆分", "中央經費", 5860000, 0, 3000000, "公開經費需求表"],
  ["時光村生態產業升級計畫", "客委會", "推動客庄產業創新加值計畫", "匡列上限", 1000000, 0, 0, "實際補助視審查結果"],
  ["時光村生態產業升級計畫", "勞動部", "多元就業開發方案", "匡列上限", 3056290, 0, 0, "實際補助視審查結果"],
  ["時光村生態產業升級計畫", "經濟部", "配合地方創生推動城鄉特色產業發展計畫", "會報列示補助", 1400000, 0, 0, "會報紀錄"],
  ["新竹縣五峰鄉地方創生計畫", "農業部", "打造永續共好地方創生計畫", "第51次會報補助", 4343000, 0, 456000, "會報補助；提案書民投45.6萬元"],
  ["新竹縣五峰鄉地方創生計畫", "文化部", "文化資產局補助地方創生計畫", "第51次會報補助", 1600000, 0, 710000, "會報補助；提案書民投71萬元"],
  ["新竹縣五峰鄉地方創生計畫", "經濟部", "配合地方創生推動城鄉特色產業發展計畫", "第51次會報補助", 1400000, 0, 1020000, "會報補助；提案書民投102萬元"],
  ["平論文地方創生計畫", "原民會", "推動原住民族特色農業升級計畫", "提案書補助", 950000, 0, 0, "平論文苦茶油產業培訓計畫"],
  ["平論文地方創生計畫", "經濟部", "配合地方創生推動城鄉特色產業發展計畫", "提案書補助", 1500000, 0, 380000, "尖石香草產業模組與文化識別系統建構計畫"],
  ["平論文地方創生計畫", "交通部", "公路公共運輸永續及交通平權計畫", "提案書補助", 14093245, 741751, 0, "尖石鄉幸福巴士計畫"],
];

const caseHeaders = [
  "年度",
  "案件",
  "鄉鎮",
  "狀態",
  "金額性質",
  "會報/公開列示補助或中央經費",
  "提案書中央補助/經費",
  "提案書地方自籌",
  "提案書民間投資",
  "提案書總經費",
  "已知金額合計",
  "完整性",
  "年度/版本註記",
  "備註",
  "來源",
  "來源連結",
];

detail.getRange("A1:P1").values = [caseHeaders];
detail.getRange(`A2:P${cases.length + 1}`).values = cases.map((c) => [
  c.year,
  c.name,
  c.township,
  c.status,
  c.sourceNature,
  c.publicSubsidy,
  c.proposalCentral,
  c.proposalLocal,
  c.proposalPrivate,
  c.proposalTotal,
  null,
  c.completeness,
  c.actualYearNote,
  c.note,
  c.source,
  c.sourceUrl,
]);
detail.getRange(`K2:K${cases.length + 1}`).formulas = cases.map((_, idx) => {
  const row = idx + 2;
  return [`=IF(J${row}<>"",J${row},SUM(F${row}:I${row}))`];
});
detail.tables.add(`A1:P${cases.length + 1}`, true, "CaseAmountTable").style = "TableStyleMedium2";
detail.freezePanes.freezeRows(1);
detail.getRange("A1:P1").format.font = { bold: true, color: "#FFFFFF" };
detail.getRange("A1:P1").format.fill = { color: "#1F4E79" };
detail.getRange("A:P").format.wrapText = true;
detail.getRange("F:K").setNumberFormat("#,##0");
detail.getRange("A:A").format.columnWidthPx = 60;
detail.getRange("B:B").format.columnWidthPx = 230;
detail.getRange("C:C").format.columnWidthPx = 80;
detail.getRange("D:E").format.columnWidthPx = 180;
detail.getRange("F:K").format.columnWidthPx = 120;
detail.getRange("L:L").format.columnWidthPx = 90;
detail.getRange("M:P").format.columnWidthPx = 240;
detail.getRange(`A1:P${cases.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };

const ministryHeaders = ["案件", "部會", "對應計畫", "金額性質", "補助/中央經費", "地方自籌", "民間投資", "備註"];
ministry.getRange("A1:H1").values = [ministryHeaders];
ministry.getRange(`A2:H${ministryRows.length + 1}`).values = ministryRows;
ministry.tables.add(`A1:H${ministryRows.length + 1}`, true, "MinistryAmountTable").style = "TableStyleMedium4";
ministry.freezePanes.freezeRows(1);
ministry.getRange("A1:H1").format.font = { bold: true, color: "#FFFFFF" };
ministry.getRange("A1:H1").format.fill = { color: "#548235" };
ministry.getRange("A:H").format.wrapText = true;
ministry.getRange("E:G").setNumberFormat("#,##0");
ministry.getRange("A:A").format.columnWidthPx = 230;
ministry.getRange("B:B").format.columnWidthPx = 90;
ministry.getRange("C:C").format.columnWidthPx = 240;
ministry.getRange("D:D").format.columnWidthPx = 130;
ministry.getRange("E:G").format.columnWidthPx = 120;
ministry.getRange("H:H").format.columnWidthPx = 220;
ministry.getRange(`A1:H${ministryRows.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#E2F0D9" };

summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["新竹縣地方創生計畫金額彙整"]];
summary.getRange("A1").format.font = { bold: true, size: 18, color: "#17365D" };
summary.getRange("A1").format.fill = { color: "#D9EAF7" };
summary.getRange("A1").format.rowHeightPx = 34;

summary.getRange("A3:C12").values = [
  ["統計項目", "金額/數量", "口徑說明"],
  ["案件數", null, "案件明細表列五案"],
  ["有公開/會報列示補助或中央經費案件數", null, "F欄不為空"],
  ["公開/會報列示補助或中央經費合計", null, "案件明細F欄加總"],
  ["提案書中央補助/經費合計", null, "案件明細G欄加總，未公開者不納入"],
  ["提案書地方自籌合計", null, "案件明細H欄加總"],
  ["提案書民間投資合計", null, "案件明細I欄加總"],
  ["提案書總經費合計", null, "案件明細J欄加總；含峨眉約數"],
  ["僅能列補助/匡列、未見總經費案件數", null, "完整性為僅補助／匡列"],
  ["會報金額與提案金額差異提醒", null, "五峰案會報補助734.3萬元；提案書中央784.4萬元"],
];
summary.getRange("B4:B11").formulas = [
  ["=COUNTA('案件明細'!B2:B6)"],
  ["=COUNT('案件明細'!F2:F6)"],
  ["=SUM('案件明細'!F2:F6)"],
  ["=SUM('案件明細'!G2:G6)"],
  ["=SUM('案件明細'!H2:H6)"],
  ["=SUM('案件明細'!I2:I6)"],
  ["=SUM('案件明細'!J2:J6)"],
  ['=COUNTIF(\'案件明細\'!L2:L6,"僅補助／匡列")'],
];
summary.getRange("B12").values = [["需分口徑引用"]];
summary.getRange("A3:C3").format.font = { bold: true, color: "#FFFFFF" };
summary.getRange("A3:C3").format.fill = { color: "#1F4E79" };
summary.getRange("A3:C12").format.borders = { preset: "all", style: "thin", color: "#BFBFBF" };
summary.getRange("A:C").format.wrapText = true;
summary.getRange("A:A").format.columnWidthPx = 240;
summary.getRange("B:B").format.columnWidthPx = 150;
summary.getRange("C:C").format.columnWidthPx = 360;
summary.getRange("B6:B10").setNumberFormat("#,##0");
summary.getRange("B4:B5").setNumberFormat("0");
summary.getRange("B11:B11").setNumberFormat("0");

summary.getRange("E3:H3").values = [["鄉鎮", "公開/會報列示金額", "提案總經費", "備註"]];
summary.getRange("E4:H8").values = [
  ["峨眉鄉", null, null, "峨眉主案總額為約數；時光村僅列補助/匡列"],
  ["寶山鄉", null, null, ""],
  ["五峰鄉", null, null, "會報補助與提案總額不同"],
  ["尖石鄉", null, null, "公開頁未列補助，採本機提案書"],
  ["合計", null, null, ""],
];
summary.getRange("F4:G7").formulas = [
  ['=SUMIF(\'案件明細\'!C2:C6,E4,\'案件明細\'!F2:F6)','=SUMIF(\'案件明細\'!C2:C6,E4,\'案件明細\'!J2:J6)'],
  ['=SUMIF(\'案件明細\'!C2:C6,E5,\'案件明細\'!F2:F6)','=SUMIF(\'案件明細\'!C2:C6,E5,\'案件明細\'!J2:J6)'],
  ['=SUMIF(\'案件明細\'!C2:C6,E6,\'案件明細\'!F2:F6)','=SUMIF(\'案件明細\'!C2:C6,E6,\'案件明細\'!J2:J6)'],
  ['=SUMIF(\'案件明細\'!C2:C6,E7,\'案件明細\'!F2:F6)','=SUMIF(\'案件明細\'!C2:C6,E7,\'案件明細\'!J2:J6)'],
];
summary.getRange("F8:G8").formulas = [["=SUM(F4:F7)", "=SUM(G4:G7)"]];
summary.getRange("E3:H3").format.font = { bold: true, color: "#FFFFFF" };
summary.getRange("E3:H3").format.fill = { color: "#548235" };
summary.getRange("E3:H8").format.borders = { preset: "all", style: "thin", color: "#BFBFBF" };
summary.getRange("E:H").format.wrapText = true;
summary.getRange("E:E").format.columnWidthPx = 90;
summary.getRange("F:G").format.columnWidthPx = 140;
summary.getRange("H:H").format.columnWidthPx = 260;
summary.getRange("F4:G8").setNumberFormat("#,##0");
summary.getRange("E8:H8").format.font = { bold: true };
summary.getRange("E8:H8").format.fill = { color: "#E2F0D9" };

summary.getRange("A14:C19").values = [
  ["圖表資料：提案書總經費", "金額", "是否納入圖表"],
  ["新竹縣峨眉鄉地方創生計畫", 109400000, "是，約數"],
  ["新竹縣寶山鄉地方創生計畫", 8860000, "是"],
  ["時光村生態產業升級計畫", 0, "否，僅列補助/匡列"],
  ["新竹縣五峰鄉地方創生計畫", 10030000, "是"],
  ["平論文地方創生計畫", 17664996, "是"],
];
summary.getRange("A14:C14").format.font = { bold: true, color: "#FFFFFF" };
summary.getRange("A14:C14").format.fill = { color: "#806000" };
summary.getRange("A14:C19").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
summary.getRange("B15:B19").setNumberFormat("#,##0");
summary.getRange("A14:C19").format.wrapText = true;

const chart = summary.charts.add("bar", summary.getRange("A14:B19"));
chart.setPosition("E11", "H27");
chart.title = "提案書總經費比較（新台幣）";
chart.hasLegend = false;
chart.xAxis = { axisType: "textAxis" };
chart.yAxis = { numberFormatCode: "#,##0" };

notes.getRange("A1:D1").values = [["項目", "說明", "統計處理", "後續查核建議"]];
notes.getRange("A2:D8").values = [
  ["會報/公開列示補助或中央經費", "來自國發會、縣府新聞或會議紀錄列示之金額。", "列入公開/會報金額統計。", "如需正式補助額，仍應調各部會核定公文或補助公告。"],
  ["提案書總經費", "來自本機提案書或公開經費需求表，含中央、地方自籌、民間投資。", "列入提案總經費統計。", "與會報補助可不同，引用時需註明版本日期。"],
  ["峨眉鄉112/109年度註記", "原表列112，但公開新聞與國發會資料顯示主案為109年輔導及第14次工作會議。", "本表保留原列年度112，另以版本註記提醒。", "若要送件，建議改列「案例年度/公開資料年度」兩欄。"],
  ["時光村案", "目前查到第46次會議補助/匡列金額，未查到完整總經費表。", "不列入提案總經費合計，只列公開/會報金額。", "續查各部會核定函與執行計畫書。"],
  ["五峰案", "第51次會報補助734.3萬元；本機提案書中央經費784.4萬元、民投218.6萬元、總額1003萬元。", "兩種口徑分欄統計。", "確認最後核定版採會報紀錄或後續部會函。"],
  ["平論文案", "公開國發會頁僅列通過；金額採本機1150318提案書。", "列入提案總經費，不列入公開/會報補助統計。", "續查第55次會議紀錄或各部會核定公文。"],
  ["幣別", "全表金額均為新台幣元；簡報可再換算為萬元。", "統計使用元，避免小數誤差。", "報告呈現時可除以10,000。"],
];
notes.tables.add("A1:D8", true, "AssumptionTable").style = "TableStyleMedium9";
notes.freezePanes.freezeRows(1);
notes.getRange("A1:D1").format.font = { bold: true, color: "#FFFFFF" };
notes.getRange("A1:D1").format.fill = { color: "#7030A0" };
notes.getRange("A:D").format.wrapText = true;
notes.getRange("A:A").format.columnWidthPx = 160;
notes.getRange("B:D").format.columnWidthPx = 330;
notes.getRange("A1:D8").format.borders = { preset: "all", style: "thin", color: "#E4DFEC" };

const finalErrorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(finalErrorScan.ndjson);

const summaryInspect = await workbook.inspect({
  kind: "table",
  range: "摘要統計!A3:H12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 8,
});
console.log(summaryInspect.ndjson);

await workbook.render({ sheetName: "摘要統計", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "案件明細", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "部會金額明細", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "資料口徑", autoCrop: "all", scale: 1, format: "png" });

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
