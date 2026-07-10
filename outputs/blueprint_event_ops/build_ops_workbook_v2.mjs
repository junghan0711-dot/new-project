import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = fileURLToPath(new URL(".", import.meta.url));
const source = JSON.parse(await fs.readFile(`${outputDir}/blueprint_event_v2_source.json`, "utf8"));
const workbook = Workbook.create();

const palette = {
  navy: "#173B57",
  teal: "#DDEFEA",
  blue: "#DCEBFA",
  yellow: "#FFF1CC",
  green: "#E4F1DD",
  red: "#FCE4D6",
  gray: "#F2F4F7",
  white: "#FFFFFF",
  border: "#D9E2EC",
  text: "#1F2933",
};

const statusFill = {
  "已完成": palette.green,
  "進行中": palette.blue,
  "未開始": palette.gray,
  "待確認": palette.yellow,
  "需協助": palette.yellow,
  "高": palette.red,
  "中": palette.yellow,
  "低": palette.green,
};

function colName(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function normalizeRows(headers, rows) {
  return rows.map((row) => headers.map((_, index) => row[index] ?? ""));
}

function styleCommon(sheet, lastCol, lastRow, widths = []) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(4);
  sheet.getRange(`A1:${colName(lastCol)}1`).format.fill.color = palette.navy;
  sheet.getRange(`A1:${colName(lastCol)}1`).format.font = {
    color: palette.white,
    bold: true,
    size: 15,
  };
  sheet.getRange(`A2:${colName(lastCol)}2`).format.fill.color = palette.teal;
  sheet.getRange(`A2:${colName(lastCol)}2`).format.font = {
    color: palette.text,
    italic: true,
  };
  sheet.getRange(`A4:${colName(lastCol)}4`).format.fill.color = palette.blue;
  sheet.getRange(`A4:${colName(lastCol)}4`).format.font = {
    bold: true,
    color: palette.text,
  };
  sheet.getRange(`A4:${colName(lastCol)}${lastRow}`).format.borders = {
    preset: "all",
    style: "thin",
    color: palette.border,
  };
  sheet.getRange(`A1:${colName(lastCol)}${lastRow}`).format.wrapText = true;
  sheet.getRange(`A1:${colName(lastCol)}${lastRow}`).format.verticalAlignment = "top";
  widths.forEach((width, index) => {
    sheet.getRange(`${colName(index + 1)}:${colName(index + 1)}`).format.columnWidth = width;
  });
}

function addConditionalFills(sheet, headers, rows) {
  const indexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => ["狀態", "目前狀態", "燈號", "風險等級", "優先級"].includes(header));

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    for (const { index } of indexes) {
      const value = String(rows[rowIndex][index] ?? "");
      const fill = Object.entries(statusFill).find(([key]) => value.includes(key))?.[1];
      if (fill) sheet.getCell(rowIndex + 4, index).format.fill.color = fill;
    }
  }
}

function makeSheet(name, title, note, headers, rows, widths = []) {
  const sheet = workbook.worksheets.add(name);
  const lastCol = headers.length;
  const normalized = normalizeRows(headers, rows);
  const matrix = [
    [title, ...Array(lastCol - 1).fill("")],
    [note, ...Array(lastCol - 1).fill("")],
    Array(lastCol).fill(""),
    headers,
    ...normalized,
  ];
  sheet.getRange(`A1:${colName(lastCol)}1`).merge();
  sheet.getRange(`A2:${colName(lastCol)}2`).merge();
  sheet.getRange(`A1:${colName(lastCol)}${matrix.length}`).values = matrix;
  styleCommon(sheet, lastCol, matrix.length, widths);
  addConditionalFills(sheet, headers, normalized);
  return sheet;
}

function nextAction(task) {
  if (task["待協助/需決策"]) return task["待協助/需決策"];
  if (task["狀態"] === "已完成") return "歸檔成果與決議，轉入下一階段引用";
  if (task["狀態"] === "未開始") return "補啟動條件、確認第一版交付物與檢核人";
  return task["本週進度/完成事項"] || "由組長回報本週進度、缺口與下一步";
}

function riskLevel(task) {
  const dueDistance = Number(task["距截止日"]);
  if (task["燈號"]?.includes("近截止")) return "高";
  if (task["待協助/需決策"]) return "中";
  if (Number.isFinite(dueDistance) && dueDistance < 0 && task["狀態"] !== "已完成") return "高";
  if (task["狀態"] === "未開始" && dueDistance <= 14) return "中";
  return "低";
}

function deliverable(task) {
  const name = `${task["工作項目"]} ${task["執行內容"]}`;
  if (name.includes("新聞稿") || name.includes("素材")) return "新聞稿/社群素材/照片影片素材清單";
  if (name.includes("預算") || name.includes("核銷") || name.includes("結算")) return "預算紀錄、領據、核銷附件、簽收紀錄";
  if (name.includes("保險") || name.includes("保全")) return "保單/保全報價比較表/承保範圍確認紀錄";
  if (name.includes("場地") || name.includes("卸貨") || name.includes("停車")) return "場地配置圖、卸貨動線、停車說明、現場指示";
  if (name.includes("廠商") || name.includes("攤位")) return "廠商名單、攤位分配圖、攤商須知、設備需求表";
  if (name.includes("獎品") || name.includes("扭蛋")) return "獎品清單、採購紀錄、保管/兌換/簽收表";
  if (name.includes("舞台") || name.includes("主持") || name.includes("表演")) return "Run Sheet、主持稿、表演需求表、彩排紀錄";
  if (name.includes("工讀生") || name.includes("人員分工")) return "人員分工表、排班表、教育訓練紀錄、通訊錄";
  if (name.includes("成果") || name.includes("檢討")) return "成果報告、素材庫、檢討會紀錄、改善清單";
  return "可交付成果與決議紀錄";
}

function dependency(task) {
  const name = `${task["工作項目"]} ${task["執行內容"]}`;
  if (name.includes("新聞稿") || name.includes("宣傳")) return "主視覺、活動亮點、廠商名單、長官審稿時程";
  if (name.includes("保險") || name.includes("保全")) return "場地使用時段、設備進場時間、保額/承保範圍";
  if (name.includes("廠商") || name.includes("攤位")) return "廠商意願問卷、分署承辦檢閱、場地配置圖";
  if (name.includes("獎品") || name.includes("扭蛋")) return "分署承辦挑選、採購預算、兌換規則";
  if (name.includes("舞台") || name.includes("主持") || name.includes("表演")) return "啟動儀式方案、主持人/表演團隊確認、舞台規格";
  if (name.includes("工讀生") || name.includes("人員分工")) return "各組人力缺口、活動日崗位、教育訓練時段";
  if (name.includes("預算") || name.includes("核銷")) return "採購清單、報價單、付款流程、領據格式";
  return "組長確認範圍與前一階段交付物";
}

function approvalNode(task) {
  const name = `${task["工作項目"]} ${task["執行內容"]}`;
  if (name.includes("新聞稿")) return "怡文初審 -> 分署承辦 -> 分署長官";
  if (name.includes("啟動儀式") || name.includes("貴賓")) return "佩妏提案 -> 怡文彙整 -> 科長/分署裁示";
  if (name.includes("廠商")) return "莞婷名單 -> 怡文複核 -> 分署承辦檢閱";
  if (name.includes("獎品")) return "莞婷/巧筑清單 -> 怡文複核 -> 分署承辦挑選";
  if (name.includes("保險") || name.includes("保全")) return "玟樺比價 -> 怡文/行政複核 -> 分署承辦確認";
  if (name.includes("戶外廣告") || name.includes("宣傳素材")) return "玟樺初稿 -> 怡文/佩妏校稿 -> 分署承辦確認";
  if (name.includes("工作手冊") || name.includes("人員分工")) return "怡文彙整 -> 各組組長確認 -> 全體行前說明";
  return "組長初審 -> 怡文總控確認";
}

const taskRows = source.tasks.map((task) => {
  const groupLead = source.lead_by_group[task["組別"]]?.["組長"] ?? "";
  return [
    task["編號"],
    task["組別"],
    groupLead,
    task["負責人"],
    task["期程"],
    task["工作項目"],
    task["執行內容"],
    task["預定完成日"],
    task["進度文字"],
    task["狀態"],
    riskLevel(task),
    task["燈號"],
    task["本週進度/完成事項"],
    task["待協助/需決策"],
    dependency(task),
    approvalNode(task),
    deliverable(task),
    nextAction(task),
    task["備註"],
  ];
});

const groupRows = Object.entries(source.lead_by_group).map(([group, info]) => {
  const tasks = source.tasks.filter((task) => task["組別"] === group);
  const needs = tasks.filter((task) => task["待協助/需決策"]).length;
  const inProgress = tasks.filter((task) => task["狀態"] === "進行中").length;
  const notStarted = tasks.filter((task) => task["狀態"] === "未開始").length;
  const nearDue = tasks.filter((task) => task["燈號"]?.includes("近截止")).length;
  const nextDue = tasks
    .filter((task) => task["狀態"] !== "已完成")
    .sort((a, b) => String(a["預定完成日"]).localeCompare(String(b["預定完成日"])))[0];
  return [
    group,
    info["組長"],
    info["組員/協作"],
    info["核心職掌"],
    tasks.length,
    inProgress,
    notStarted,
    needs,
    nearDue,
    nextDue ? `${nextDue["預定完成日"]}｜${nextDue["工作項目"]}｜${nextDue["負責人"]}` : "目前無未完成任務",
    needs > 0 || nearDue > 0 ? "需總控會議優先處理" : "照原排程追蹤",
  ];
});

makeSheet(
  "00_主管總覽",
  "2026好時光・靚市集｜活動細項總控表 v3",
  `來源：${source.source_url}。本版把各組現有負責人、31項回報任務與審核節點整合為會議追蹤表；新聞稿倒推移至範例頁，用來示範每項工作都要拆到可執行細節。`,
  ["指標", "數值", "判讀", "下一步", "主責", "期限", "備註"],
  [
    ["總任務數", source.summary_metrics["總任務數"] || source.tasks.length, "來源表目前任務總量", "維持每週更新一次", "怡文", "每週籌備會", ""],
    ["整體完成率", "15.8%", "目前仍在籌備啟動期", "先處理近截止與需決策項", "各組組長", "2026-07-20", ""],
    ["已完成件數", source.summary_metrics["已完成件數"] || 1, "場地會勘已完成", "把場勘成果轉為配置圖/卸貨動線", "怡文/莞婷", "2026-07-13", ""],
    ["進行中件數", source.summary_metrics["進行中件數"] || 14, "多數工作已啟動但交付物未定稿", "每項補上交付物與審核人", "各組組長", "2026-07-20", ""],
    ["未開始件數", source.summary_metrics["未開始件數"] || 16, "集中在活動日執行與收尾", "先完成活動日分工/工作手冊骨架", "怡文", "2026-09-20", ""],
    ["需協助件數", source.summary_metrics["需協助件數"] || 6, "需要總控或分署承辦介入", "放入下一次籌備會決議", "怡文", "2026-07-17", ""],
    ["7天內到期未完成", source.summary_metrics["7天內到期未完成"] || 6, "第一期節點壓力高", "逐項確認是否延長或改交付標準", "怡文/各組", "2026-07-17", ""],
  ],
  [20, 18, 32, 36, 16, 16, 28],
);

makeSheet(
  "01_各組負責人",
  "各組負責人與目前缺口",
  "用途：把現有組長、活動日分組、待聘人力與下一個檢核點放在同一頁，方便籌備會逐組確認。",
  ["組別", "組長", "組員/協作", "核心職掌", "任務數", "進行中", "未開始", "需協助", "近截止", "下一個檢核點", "總控提醒"],
  groupRows,
  [16, 14, 44, 36, 10, 10, 10, 10, 10, 42, 28],
);

makeSheet(
  "02_細項工作包",
  "細項工作包｜31項任務補齊人、依賴、審核與交付物",
  "用途：各組回報不只看進度%，也要知道下一步卡在哪、誰審、最後要交什麼。",
  [
    "編號",
    "組別",
    "組長",
    "負責人",
    "期程",
    "工作項目",
    "執行內容",
    "預定完成日",
    "進度",
    "狀態",
    "風險等級",
    "燈號",
    "本週進度/完成事項",
    "待協助/需決策",
    "前置依賴",
    "審核節點",
    "交付物",
    "下一步",
    "備註",
  ],
  taskRows,
  [10, 14, 14, 14, 20, 28, 42, 14, 10, 12, 12, 16, 42, 38, 36, 36, 36, 38, 42],
);

function makeNewsExampleSheet() {
  return makeSheet(
  "07_範例_新聞稿倒推",
  "範例｜新聞稿與媒體曝光倒推拆解",
  "用途：這不是單獨排序的工作項，而是示範每一項工作都應該拆成日期、節點、主責、協作、交付物、前置條件與風險提醒。",
  ["序", "日期", "節點", "主責", "協作/審核", "交付物", "前置條件", "風險提醒"],
  [
    [1, "2026-07-20", "確認活動定位、標語與第一波主視覺方向", "玟樺", "佩妏、怡文", "新聞稿核心訊息草稿", "啟動儀式與主視覺方向須有初版", "若定位未定，後續稿件會一直改"],
    [2, "2026-08-05", "蒐集攤商/單位亮點與可採訪故事", "莞婷", "柏升、招商組", "採訪素材清單", "廠商初選名單與產品特色", "需避免只剩活動資訊，沒有故事角度"],
    [3, "2026-08-15", "確認新聞角度、受訪名單與照片需求", "玟樺", "佩妏、莞婷", "新聞稿大綱與採訪清單", "廠商亮點、長官致詞方向", "採訪對象要先確認同意露出"],
    [4, "2026-08-25", "完成新聞稿架構與媒體邀請名單初版", "玟樺", "怡文", "新聞稿架構、媒體名單", "活動流程/貴賓名單初版", "媒體名單若太晚整理，邀請效益下降"],
    [5, "2026-09-05", "新聞稿初稿、照片/短影音素材清單", "玟樺", "佩妏", "新聞稿初稿 v1", "宣傳素材與攝影/短片需求", "素材若未到位，長官審稿只會看到空稿"],
    [6, "2026-09-08", "內部初審：語氣、政策亮點、數據、活動資訊", "怡文", "玟樺、佩妏", "內部修訂意見", "新聞稿初稿 v1", "內部修稿至少預留2天"],
    [7, "2026-09-10", "完成修訂版並補齊媒體包附件", "玟樺", "佩妏", "新聞稿 v2、照片/活動資訊附件", "內部初審完成", "附件缺漏會增加分署往返次數"],
    [8, "2026-09-12", "送分署承辦審閱", "怡文", "分署承辦", "送審版新聞稿", "內部修訂版定稿", "送承辦後避免再大幅改版"],
    [9, "2026-09-17", "分署長官/主管核稿", "分署承辦", "怡文、玟樺", "長官核示意見", "承辦初審完成", "至少預留3-5個工作天"],
    [10, "2026-09-19", "完成對外發布版", "玟樺", "怡文、分署承辦", "新聞稿定稿、媒體包", "長官核示完成", "定稿後同步鎖定活動資訊版本"],
    [11, "2026-09-22", "媒體邀請與採訪提醒", "佩妏", "玟樺、怡文", "媒體邀請信/採訪提醒", "媒體名單、活動亮點、接待動線", "要同步貴賓接待與聯訪位置"],
    [12, "2026-09-23", "活動前新聞稿/社群預熱發布", "玟樺", "分署承辦", "對外稿、社群貼文", "發布版核定", "發布時間需避開假日與連假前低流量"],
    [13, "2026-10-03", "活動日媒體接待、照片/影片即時回收", "佩妏", "昱碩、怡文、攝影團隊", "媒體簽到、照片精選、聯訪紀錄", "貴賓/媒體動線與主持流程", "現場若無專人接媒體，素材會散落"],
    [14, "2026-10-04~2026-10-07", "活動後成果稿與社群後續曝光", "佩妏", "玟樺、怡文", "成果新聞稿、照片包、社群貼文", "活動照片、KPI、攤商回饋", "成果稿要搶在熱度消退前完成"],
  ],
  [8, 22, 34, 16, 24, 34, 34, 38],
);
}

makeSheet(
  "03_審核流轉表",
  "審核流轉表｜哪些東西要先給誰看",
  "用途：把需要科長、分署承辦或長官看的項目提前排入時程，避免臨近活動才卡關。",
  ["項目", "主責", "第一審", "外部/主管審核", "建議送審日", "需回覆日", "交付物", "備註"],
  [
    ["各組分工與職掌", "怡文", "各組組長", "怡文總控", "2026-07-10", "2026-07-17", "組織分工表、職掌表", "來源表已完成初步分組，需各組確認"],
    ["啟動儀式方案", "佩妏", "怡文", "科長/分署承辦", "2026-07-10", "2026-07-15", "方案A/B、預算/道具需求", "二籌會議請科長裁示"],
    ["貴賓名單與接待路線", "佩妏", "怡文、昱碩", "分署承辦/長官", "2026-07-17", "2026-07-24", "貴賓名單、巡禮路線、接待分工", "需接上媒體聯訪與拍照點"],
    ["廠商初選名單", "莞婷", "怡文", "分署承辦", "2026-07-15", "2026-07-18", "25家名單、備選名單、篩選原則", "來源表預計7/15給分署承辦檢閱"],
    ["12項大禮/扭蛋商品", "莞婷/巧筑", "怡文", "分署承辦", "2026-07-13", "2026-07-20", "獎品清單、預算、兌換規則", "12項大禮由莞婷，扭蛋機商品由巧筑"],
    ["公共意外責任險與夜間保全", "玟樺", "怡文/行政", "分署承辦", "2026-07-13", "2026-07-17", "保險報價、保全比價、承保範圍", "建議再比價其他保全公司"],
    ["主視覺與宣傳素材", "玟樺", "佩妏、怡文", "分署承辦", "2026-07-20", "2026-07-24", "海報、社群文案、新聞稿方向", "靜態海報可請就業中心張貼"],
    ["識別證/通行證/工作證", "玟樺", "怡文", "各組組長", "2026-07-24", "2026-07-31", "證件版型、印製數量、發放表", "需接上工讀生與活動日人員分工"],
    ["路燈旗/戶外廣告", "玟樺", "怡文", "場地方/主管機關或分署承辦", "2026-08-15", "2026-08-31", "申請資料、設計完稿、刊登清單", "來源表估80組，每組440元"],
    ["主持稿/舞台流程", "佩妏", "怡文", "分署承辦/長官", "2026-09-05", "2026-09-12", "主持稿、Run Sheet、貴賓稱謂", "需和啟動儀式及表演團隊同步"],
    ["工作手冊與活動日分工", "怡文", "各組組長", "全體行前說明", "2026-09-10", "2026-09-20", "工作手冊、通訊錄、對講機/識別物分配", "來源表已完成分區人員分工表初版"],
    ["新聞稿定稿", "玟樺", "怡文", "分署承辦/長官", "2026-09-12", "2026-09-19", "新聞稿、媒體包、發布排程", "詳見07_範例_新聞稿倒推"],
  ],
  [28, 16, 22, 28, 16, 16, 38, 42],
);

makeSheet(
  "04_待協助與近截止",
  "待協助與近截止清單",
  "用途：每次會議優先處理這一頁，不要從31項任務逐列找紅黃燈。",
  ["組別", "編號", "工作項目", "負責人", "預定完成日", "燈號", "待協助/需決策", "建議處理方式", "會議決議"],
  source.tasks
    .filter((task) => task["待協助/需決策"] || task["燈號"]?.includes("近截止"))
    .map((task) => [
      task["組別"],
      task["編號"],
      task["工作項目"],
      task["負責人"],
      task["預定完成日"],
      task["燈號"],
      task["待協助/需決策"],
      nextAction(task),
      "",
    ]),
  [14, 10, 30, 14, 16, 16, 44, 44, 34],
);

makeSheet(
  "05_活動日分工",
  "活動日分工｜10/3現場角色與替補",
  "用途：把目前已出現的人員配置先落位，後續補電話、對講機、集合點、替補。",
  ["區塊", "組長/主責", "組員/協作", "主要任務", "需事前準備", "活動日確認點", "替補/缺口", "備註"],
  [
    ["總控", "怡文", "各組組長", "掌握全場進度、貴賓/媒體/突發狀況總協調", "總控表、工作手冊、通訊錄、決策權限", "每30分鐘回報一次關鍵狀態", "副總控待確認", "專06"],
    ["長官/貴賓接待", "怡文", "昱碩協助", "長官抵達、引導、巡禮、拍照與聯訪銜接", "貴賓名單、稱謂、巡禮路線、致詞稿", "抵達時間、合照名單、聯訪位置", "接待替補待確認", "來源備註：昱碩協助長官/貴賓接待"],
    ["機動組", "玟樺", "工讀生/機動人力待聘", "環境維護、人潮疏散、進撤場臨停管控、突發狀況回報", "機動SOP、對講機、巡場路線", "人潮瓶頸、垃圾/安全、臨停狀態", "工讀生待聘", "專07"],
    ["舞台組", "佩妏", "PT待聘*1、主持人、表演團隊", "音響燈光、主持稿、表演走位、舞台彩排、流程控管", "Run Sheet、主持稿、表演需求、音控表", "彩排完成、主持稿版本、表演進出場", "PT待聘*1", "活04"],
    ["民眾服務與促銷互動", "莞婷", "莞蓉、巧筑、PT待聘*1", "集點扭蛋兌換、獎項兌換簽收、粉專分享禮、摸彩券確認、現場諮詢與排隊動線", "兌換規則、簽收表、扭蛋機、獎品保管表、排隊標示", "獎品庫存、兌換排隊、簽收完整性、民眾詢問處理", "莞蓉/巧筑/PT待聘*1", "活05｜回到上一版主責規劃：莞婷主責，莞蓉協作/備援"],
    ["攝影組", "佩妏", "雷利與嚴毅團隊協助", "活動拍照、攝影、90秒影片素材、成果素材回收", "拍攝清單、重點畫面、授權/露出注意事項", "開幕、貴賓、攤商、人潮、互動畫面", "素材接收窗口待確認", "活06"],
    ["攤位組", "柏升", "怡君、PT待聘*1、莞婷協作", "廠商進駐引導、攤商資料袋發放、營收表提醒、撤場協助", "攤位圖、廠商報到表、資料袋、卸貨/停車說明", "進場完成率、缺席攤位、設備需求", "PT待聘*1", "招05"],
    ["宣傳組", "玟樺", "藍晒圖店家、就業中心、現場協助人力待補", "DM發放、打卡牆引導、入口意象互動、遊戲規則介紹", "DM、海報、互動道具、社群貼文QR", "入口人流、打卡互動、宣傳品庫存", "現場協助人力待補", "行06"],
    ["安全/保全", "玟樺", "保全廠商待確認", "10/2大型設備進駐後與10/3活動採購禮品看管", "保全比價、值勤時段、交接清單", "夜間看管、貴重物品、撤場交接", "保全廠商需再比價", "行01"],
  ],
  [18, 18, 32, 42, 42, 36, 24, 34],
);

makeSheet(
  "06_來源回報資料",
  "來源回報資料｜保留各組原始回報欄位",
  "用途：保留來源表抽出的31筆資料，方便回頭比對。",
  ["來源頁籤", "編號", "組別", "期程", "工作項目", "執行內容", "負責人", "預定完成日", "進度", "狀態", "本週進度/完成事項", "待協助/需決策", "最後更新日", "燈號", "備註"],
  source.tasks.map((task) => [
    task["來源頁籤"],
    task["編號"],
    task["組別"],
    task["期程"],
    task["工作項目"],
    task["執行內容"],
    task["負責人"],
    task["預定完成日"],
    task["進度文字"],
    task["狀態"],
    task["本週進度/完成事項"],
    task["待協助/需決策"],
    task["最後更新日"],
    task["燈號"],
    task["備註"],
  ]),
  [20, 10, 14, 20, 30, 44, 14, 16, 10, 12, 44, 42, 16, 16, 44],
);

makeNewsExampleSheet();

const overview = workbook.worksheets.getItem("00_主管總覽");
overview.getRange("I1:K1").merge();
overview.getRange("I1:K1").values = [["目前各組組長"]];
overview.getRange("I1:K1").format.fill.color = palette.navy;
overview.getRange("I1:K1").format.font = { color: palette.white, bold: true, size: 13 };
overview.getRange("I2:K6").values = [
  ["專案統籌", "怡文", "總控、預算、工作手冊"],
  ["行政風險", "玟樺", "保險、保全、工讀生結算"],
  ["活動組", "佩妏", "啟動儀式、舞台、攝影"],
  ["招商組", "莞婷", "廠商、攤位、獎品"],
  ["行銷設計", "玟樺", "宣傳素材、新聞稿、物料"],
];
overview.getRange("I2:K6").format.borders = { preset: "all", style: "thin", color: palette.border };
overview.getRange("I2:I6").format.fill.color = palette.blue;
overview.getRange("I2:I6").format.font = { bold: true };
overview.getRange("I:K").format.columnWidth = 22;

const keyInspect = await workbook.inspect({
  kind: "table",
  sheetId: "01_各組負責人",
  range: "A1:K12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 11,
  maxChars: 6000,
});
console.log(keyInspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "final formula error scan",
  maxChars: 3000,
});
console.log(errors.ndjson);

for (const sheet of workbook.worksheets.items) {
  const png = await workbook.render({ sheetName: sheet.name, autoCrop: "all", scale: 1, format: "png" });
  const bytes = new Uint8Array(await png.arrayBuffer());
  await fs.writeFile(`${outputDir}/preview_v2_${sheet.name}.png`, bytes);
  console.log(`rendered ${sheet.name}: ${bytes.length} bytes`);
}

const output = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = `${outputDir}/2026好時光靚市集_活動細項總控表_v3.xlsx`;
await output.save(outputPath);
console.log(`saved ${outputPath}`);
