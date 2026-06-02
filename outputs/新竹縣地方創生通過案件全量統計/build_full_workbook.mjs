import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/junghanchiu/Documents/New project/outputs/新竹縣地方創生通過案件全量統計";
const outputPath = `${outputDir}/新竹縣地方創生通過案件全量統計.xlsx`;

const workbook = Workbook.create();
const summary = workbook.worksheets.getOrAdd("摘要統計", { renameFirstIfOnlyNewSpreadsheet: true });
const detail = workbook.worksheets.add("全量案件明細");
const byType = workbook.worksheets.add("類型統計");
const byTown = workbook.worksheets.add("鄉鎮統計");
const byYear = workbook.worksheets.add("年度統計");
const notes = workbook.worksheets.add("資料口徑與來源");

for (const sheet of [summary, detail, byType, byTown, byYear, notes]) {
  sheet.showGridLines = false;
}

const sourceUrls = {
  ndcEmey: "https://www.ndc.gov.tw/nc_8456_33731",
  hsinchuEmey: "https://information.hsinchu.gov.tw/News_Content.aspx?n=2203&s=225153",
  baosanPdf: "https://ws.hsinchu.gov.tw/Download.ashx?n=5a%2B25bGx6YSJ57aT6LK76ZyA5rGC6KGoLnBkZg%3D%3D&u=LzAwMS9VcGxvYWQvMTQvcmVsZmlsZS85NDk5LzIyOTQ1MC8yYjljMDgyNy0yYTFhLTQ0Y2MtYjYyNS1hNThkOWU4NzNhMTMucGRm",
  countyTopic: "https://www.hsinchu.gov.tw/News_Content.aspx?n=148&s=201112",
  timeVillage: "https://gdd.hsinchu.gov.tw/News_Content.aspx?n=1212&s=267784&sms=9499",
  wufeng: "https://www.ndc.gov.tw/nc_14813_39519",
  pinglewen: "https://www.ndc.gov.tw/nc_14813_40035",
  localDb: "/Users/junghanchiu/2026 Data base/知識庫/地方創生資料庫/地創團隊/地創團隊完整資料庫.csv",
  local115: "/Users/junghanchiu/2026 Data base/專案庫/北部辦公室/專案-115年度新竹縣地方創生輔導案.md",
};

const cases = [
  {
    year: 109,
    originalYear: "原表列112；公開資料為109年第14次工作會議",
    name: "新竹縣峨眉鄉地方創生計畫",
    township: "峨眉鄉",
    type: "鄉鎮公所提案",
    subType: "行政院地方創生會報工作會議",
    applicant: "峨眉鄉公所",
    status: "通過/公開列示",
    subsidy: 68208000,
    local: 5000000,
    private: 36192000,
    total: 109400000,
    amountNature: "公開推估/媒合經費；地方自籌為近500萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "縣府新聞列中央部會經費6820.8萬元、民間投資3619.2萬元、地方自籌近500萬元；國發會第14次工作會議資料。",
    source: `新竹縣府新聞；國發會新聞稿；${sourceUrls.hsinchuEmey}；${sourceUrls.ndcEmey}`,
  },
  {
    year: 109,
    originalYear: "原表列112；公開PDF為經費需求表",
    name: "新竹縣寶山鄉地方創生計畫",
    township: "寶山鄉",
    type: "鄉鎮公所提案",
    subType: "行政院地方創生會報工作會議",
    applicant: "寶山鄉公所",
    status: "通過/公開列示",
    subsidy: 5860000,
    local: 0,
    private: 3000000,
    total: 8860000,
    amountNature: "公開經費需求表",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "公開PDF列總經費需求886萬元、中央經費586萬元、民間投資300萬元。",
    source: `新竹縣府公開PDF；${sourceUrls.baosanPdf}`,
  },
  {
    year: 110,
    originalYear: "",
    name: "森林循環湖口創生地方創生青年培力工作站",
    township: "湖口鄉",
    type: "青年培力工作站",
    subType: "110年度核定",
    applicant: "森林循環碳經濟創生有限公司/REWOOD團隊",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "縣府專頁列新竹縣110年獲核定3處青年培力工作站，各站核定經費300萬元。",
    source: `新竹縣地方創生專頁；${sourceUrls.countyTopic}`,
  },
  {
    year: 110,
    originalYear: "",
    name: "共下歇 關西築新城",
    township: "關西鎮",
    type: "青年培力工作站",
    subType: "110年度核定",
    applicant: "關西地方創生青年培力團隊",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列110年度青年培力工作站；縣府專頁列每站300萬元。",
    source: `${sourceUrls.localDb}；${sourceUrls.countyTopic}`,
  },
  {
    year: 110,
    originalYear: "",
    name: "共享峨眉-創生系統建構計畫",
    township: "峨眉鄉",
    type: "青年培力工作站",
    subType: "110年度核定",
    applicant: "竹縣文創藝術觀光發展協會",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列110年度青年培力工作站；縣府專頁列每站300萬元。",
    source: `${sourceUrls.localDb}；${sourceUrls.countyTopic}`,
  },
  {
    year: 110,
    originalYear: "",
    name: "「青年入庄來翻轉」新庄子公有市場2樓基地活化計畫",
    township: "新豐鄉",
    type: "公有空間活化",
    subType: "地方創生公有建築空間整備活化補助",
    applicant: "新豐鄉公所",
    status: "核定",
    subsidy: 3035660,
    local: 0,
    private: 0,
    total: 3035660,
    amountNature: "國發會核定補助總經費",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "縣府專頁列110年國發會核定補助總經費303萬5,660元。",
    source: `新竹縣地方創生專頁；${sourceUrls.countyTopic}`,
  },
  {
    year: 112,
    originalYear: "",
    name: "行動原香、地方飄鄉",
    township: "竹東鎮",
    type: "獎勵青年投入地方創生",
    subType: "112年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 300000,
    local: 0,
    private: 0,
    total: 300000,
    amountNature: "制度獎勵金；112年度每案30萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列112年度入選；112年度青年行動計畫獎勵金每案30萬元。",
    source: sourceUrls.localDb,
  },
  {
    year: 112,
    originalYear: "",
    name: "芎林故事轉譯站",
    township: "芎林鄉",
    type: "獎勵青年投入地方創生",
    subType: "112年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 300000,
    local: 0,
    private: 0,
    total: 300000,
    amountNature: "制度獎勵金；112年度每案30萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列112年度入選。",
    source: sourceUrls.localDb,
  },
  {
    year: 112,
    originalYear: "",
    name: "歸日作粄橫生趣",
    township: "橫山鄉",
    type: "獎勵青年投入地方創生",
    subType: "112年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 300000,
    local: 0,
    private: 0,
    total: 300000,
    amountNature: "制度獎勵金；112年度每案30萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列112年度入選。",
    source: sourceUrls.localDb,
  },
  {
    year: 112,
    originalYear: "",
    name: "客家民族植物體驗遊程",
    township: "竹北市",
    type: "獎勵青年投入地方創生",
    subType: "112年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 300000,
    local: 0,
    private: 0,
    total: 300000,
    amountNature: "制度獎勵金；112年度每案30萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列112年度入選。",
    source: sourceUrls.localDb,
  },
  {
    year: 112,
    originalYear: "",
    name: "竹現靚行式．NeWow藝聚場-新竹縣創『客』基地",
    township: "竹北市",
    type: "公有空間活化",
    subType: "地方創生公有建築空間整備活化補助",
    applicant: "新竹縣政府文化局",
    status: "核定後撤案",
    subsidy: 2130000,
    local: 540000,
    private: 0,
    total: 2670000,
    amountNature: "核定金額；後續撤案",
    includeEffective: "否",
    includeStrict: "是",
    evidence: "縣府專頁列112年度核定總經費267萬元、國發會213萬元、文化局配合款54萬元，後續撤案。",
    source: `新竹縣地方創生專頁；${sourceUrls.countyTopic}`,
  },
  {
    year: 113,
    originalYear: "",
    name: "森林循環湖口創生",
    township: "湖口鄉",
    type: "青年培力工作站",
    subType: "113年度核定",
    applicant: "森林循環碳經濟創生有限公司",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；每站原則300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列113年度青年培力工作站；公開資料列每站原則300萬元。",
    source: sourceUrls.localDb,
  },
  {
    year: 113,
    originalYear: "API鄉鎮欄曾列北埔；依大山背場域修正為橫山鄉",
    name: "大山橙黃橘綠時",
    township: "橫山鄉",
    type: "青年培力工作站",
    subType: "113年度核定",
    applicant: "大山北月",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；每站原則300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列113年度青年培力工作站；描述場域為橫山鄉大山背。",
    source: sourceUrls.localDb,
  },
  {
    year: 113,
    originalYear: "",
    name: "鹿寮坑溪青培工作站",
    township: "芎林鄉",
    type: "青年培力工作站",
    subType: "113年度核定",
    applicant: "石竹創意工作室有限公司/鹿寮坑團隊",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；每站原則300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列113年度青年培力工作站；專案筆記提示鹿寮坑行政區以芎林鄉為準。",
    source: `${sourceUrls.localDb}；${sourceUrls.local115}`,
  },
  {
    year: 113,
    originalYear: "延續補助，與110年度同團隊獨立計算",
    name: "共下歇青年工作站",
    township: "關西鎮",
    type: "青年培力工作站",
    subType: "113年度延續補助",
    applicant: "關西地方創生青年培力團隊",
    status: "核定/延續",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；延續補助每站原則300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "公開資料列113年度延續補助地方創生青年培力工作站。",
    source: "國發會/公開核定名單",
  },
  {
    year: 113,
    originalYear: "",
    name: "新·新埔 故事手札",
    township: "新埔鎮",
    type: "獎勵青年投入地方創生",
    subType: "113年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 350000,
    local: 0,
    private: 0,
    total: 350000,
    amountNature: "制度獎勵金；113年度起每案35萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列113年度入選；公開資料列113年度獎勵金每隊35萬元。",
    source: sourceUrls.localDb,
  },
  {
    year: 113,
    originalYear: "",
    name: "『漬』在一起吃",
    township: "橫山鄉",
    type: "獎勵青年投入地方創生",
    subType: "113年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 350000,
    local: 0,
    private: 0,
    total: 350000,
    amountNature: "制度獎勵金；113年度起每案35萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列113年度入選。",
    source: sourceUrls.localDb,
  },
  {
    year: 113,
    originalYear: "",
    name: "留夏海田 野食趣",
    township: "竹北市",
    type: "獎勵青年投入地方創生",
    subType: "113年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 350000,
    local: 0,
    private: 0,
    total: 350000,
    amountNature: "制度獎勵金；113年度起每案35萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列113年度入選。",
    source: sourceUrls.localDb,
  },
  {
    year: 114,
    originalYear: "",
    name: "新·新埔 後生聚",
    township: "新埔鎮",
    type: "青年培力工作站",
    subType: "114年度核定",
    applicant: "新埔地方創生青年培力團隊",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；每站300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列114年度青年培力工作站；公開資料列核定金額300萬元。",
    source: sourceUrls.localDb,
  },
  {
    year: 114,
    originalYear: "延續補助，與113年度鹿寮坑溪青培工作站獨立計算",
    name: "鹿寮坑溪青培工作站",
    township: "芎林鄉",
    type: "青年培力工作站",
    subType: "114年度延續補助",
    applicant: "石竹創意工作室有限公司",
    status: "核定/延續",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；延續補助300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "公開資料列114年度延續補助地方創生青年培力工作站鹿寮坑案。",
    source: "國發會/公開核定名單",
  },
  {
    year: 114,
    originalYear: "",
    name: "鹿寮坑製造˙里山工坊",
    township: "芎林鄉",
    type: "獎勵青年投入地方創生",
    subType: "114年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 350000,
    local: 0,
    private: 0,
    total: 350000,
    amountNature: "制度獎勵金；每案35萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "地創團隊資料庫列114年度入選；公開資料列青年行動計畫每隊35萬元。",
    source: sourceUrls.localDb,
  },
  {
    year: 114,
    originalYear: "",
    name: "新竹縣峨眉鄉「時光村生態產業升級計畫」",
    township: "峨眉鄉",
    type: "多元徵件/會報工作會議",
    subType: "第46次工作會議",
    applicant: "峨眉地方創生團隊",
    status: "通過會報",
    subsidy: 5456290,
    local: 0,
    private: 0,
    total: 5456290,
    amountNature: "會報列示中央補助/匡列上限；非完整總經費",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "第46次工作會議紀錄列客委會100萬元上限、勞動部305.629萬元上限、經濟部140萬元。",
    source: `第46次工作會議；${sourceUrls.timeVillage}`,
  },
  {
    year: 114,
    originalYear: "",
    name: "新竹縣五峰鄉地方創生計畫",
    township: "五峰鄉",
    type: "多元徵件/會報工作會議",
    subType: "第51次工作會議",
    applicant: "五峰鄉公所/地方團隊",
    status: "通過會報",
    subsidy: 7343000,
    local: 0,
    private: 2186000,
    total: 10030000,
    amountNature: "會報補助734.3萬元；提案書總經費1003萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "第51次會報補助合計734.3萬元；本機提案書列中央784.4萬元、民投218.6萬元、總經費1003萬元。",
    source: `國發會第51次通過頁；本機五峰提案書；${sourceUrls.wufeng}`,
  },
  {
    year: 115,
    originalYear: "",
    name: "森林循環湖口創生",
    township: "湖口鄉",
    type: "青年培力工作站",
    subType: "115年度高階組",
    applicant: "森林循環碳經濟創生有限公司",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；高階組300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "115年度新竹縣輔導案正確名單列培力工作站高階；本機資料庫列核定經費300萬元。",
    source: `${sourceUrls.local115}；${sourceUrls.localDb}`,
  },
  {
    year: 115,
    originalYear: "",
    name: "鹿寮坑細路青培工作站",
    township: "芎林鄉",
    type: "青年培力工作站",
    subType: "115年度高階組",
    applicant: "石竹創意工作室有限公司",
    status: "核定",
    subsidy: 3000000,
    local: 0,
    private: 0,
    total: 3000000,
    amountNature: "核定經費；高階組300萬元",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "115年度新竹縣輔導案正確名單列培力工作站高階；本機資料庫列核定經費300萬元。",
    source: `${sourceUrls.local115}；${sourceUrls.localDb}`,
  },
  {
    year: 115,
    originalYear: "",
    name: "釀味漬灶所",
    township: "橫山鄉",
    type: "利他行動168",
    subType: "115年度利他行動168",
    applicant: "土者土者女子工作室",
    status: "入選/獎勵",
    subsidy: 680000,
    local: 0,
    private: 0,
    total: 680000,
    amountNature: "制度最高獎勵金68萬元；公開名單未逐案列實支",
    includeEffective: "是",
    includeStrict: "否",
    evidence: "115年度正確名單列利他行動168；公開制度為最高提供68萬元。",
    source: sourceUrls.local115,
  },
  {
    year: 115,
    originalYear: "",
    name: "糖米青銀新城樂Q誌",
    township: "寶山鄉",
    type: "利他行動168",
    subType: "115年度利他行動168",
    applicant: "樂山米食工作室",
    status: "入選/獎勵",
    subsidy: 680000,
    local: 0,
    private: 0,
    total: 680000,
    amountNature: "制度最高獎勵金68萬元；公開名單未逐案列實支",
    includeEffective: "是",
    includeStrict: "否",
    evidence: "115年度正確名單列利他行動168；公開制度為最高提供68萬元。",
    source: sourceUrls.local115,
  },
  {
    year: 115,
    originalYear: "",
    name: "好運村數位社區事務所",
    township: "新埔鎮",
    type: "獎勵青年投入地方創生",
    subType: "115年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 350000,
    local: 0,
    private: 0,
    total: 350000,
    amountNature: "制度獎勵金；115年度沿用每案35萬元口徑",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "115年度新竹縣輔導案正確名單列獎勵青年投入。",
    source: sourceUrls.local115,
  },
  {
    year: 115,
    originalYear: "",
    name: "打粄橫好客語共創繪",
    township: "橫山鄉",
    type: "獎勵青年投入地方創生",
    subType: "115年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 350000,
    local: 0,
    private: 0,
    total: 350000,
    amountNature: "制度獎勵金；115年度沿用每案35萬元口徑",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "115年度新竹縣輔導案正確名單列獎勵青年投入。",
    source: sourceUrls.local115,
  },
  {
    year: 115,
    originalYear: "",
    name: "林林后循環木藝創生",
    township: "北埔鄉",
    type: "獎勵青年投入地方創生",
    subType: "115年度青年行動計畫",
    applicant: "青年團隊",
    status: "入選/獎勵",
    subsidy: 350000,
    local: 0,
    private: 0,
    total: 350000,
    amountNature: "制度獎勵金；115年度沿用每案35萬元口徑",
    includeEffective: "是",
    includeStrict: "是",
    evidence: "115年度新竹縣輔導案正確名單列獎勵青年投入。",
    source: sourceUrls.local115,
  },
  {
    year: 115,
    originalYear: "",
    name: "平論文地方創生計畫",
    township: "尖石鄉",
    type: "鄉鎮公所提案",
    subType: "第55次工作會議",
    applicant: "尖石鄉公所",
    status: "通過會報",
    subsidy: 16543245,
    local: 741751,
    private: 380000,
    total: 17664996,
    amountNature: "本機提案書經費需求；公開頁未列補助金額",
    includeEffective: "是",
    includeStrict: "否",
    evidence: "1150318提案書列總經費1766.4996萬元、補助1654.3245萬元、地方自籌74.1751萬元、民投38萬元。",
    source: `國發會第55次通過頁；本機尖石提案書；${sourceUrls.pinglewen}`,
  },
];

const headers = [
  "年度",
  "原年度/版本註記",
  "案件名稱",
  "鄉鎮",
  "計畫類型",
  "子類型/批次",
  "申請/執行單位",
  "狀態",
  "補助/獎勵金額",
  "地方自籌",
  "民間投資/自籌",
  "提案/核定總經費",
  "金額口徑",
  "納入有效統計",
  "納入嚴格核定統計",
  "查核依據",
  "來源",
];

detail.getRange("A1:Q1").values = [headers];
detail.getRange(`A2:Q${cases.length + 1}`).values = cases.map((c) => [
  c.year,
  c.originalYear,
  c.name,
  c.township,
  c.type,
  c.subType,
  c.applicant,
  c.status,
  c.subsidy,
  c.local,
  c.private,
  c.total,
  c.amountNature,
  c.includeEffective,
  c.includeStrict,
  c.evidence,
  c.source,
]);
detail.tables.add(`A1:Q${cases.length + 1}`, true, "AllCasesTable").style = "TableStyleMedium2";
detail.freezePanes.freezeRows(1);
detail.freezePanes.freezeColumns(3);
detail.getRange("A1:Q1").format.font = { bold: true, color: "#FFFFFF" };
detail.getRange("A1:Q1").format.fill = { color: "#1F4E79" };
detail.getRange("A:Q").format.wrapText = true;
detail.getRange("I:L").setNumberFormat("#,##0");
detail.getRange("A:A").format.columnWidthPx = 58;
detail.getRange("B:B").format.columnWidthPx = 160;
detail.getRange("C:C").format.columnWidthPx = 260;
detail.getRange("D:D").format.columnWidthPx = 80;
detail.getRange("E:F").format.columnWidthPx = 145;
detail.getRange("G:G").format.columnWidthPx = 190;
detail.getRange("H:H").format.columnWidthPx = 95;
detail.getRange("I:L").format.columnWidthPx = 120;
detail.getRange("M:M").format.columnWidthPx = 230;
detail.getRange("N:O").format.columnWidthPx = 90;
detail.getRange("P:Q").format.columnWidthPx = 310;
detail.getRange(`A1:Q${cases.length + 1}`).format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };

const typeNames = [...new Set(cases.map((c) => c.type))].sort();
byType.getRange("A1:F1").values = [["計畫類型", "案件數", "有效案件數", "補助/獎勵金額合計", "提案/核定總經費合計", "備註"]];
byType.getRange(`A2:A${typeNames.length + 1}`).values = typeNames.map((t) => [t]);
byType.getRange(`B2:E${typeNames.length + 1}`).formulas = typeNames.map((_, idx) => {
  const row = idx + 2;
  return [
    `=COUNTIF('全量案件明細'!E:E,A${row})`,
    `=COUNTIFS('全量案件明細'!E:E,A${row},'全量案件明細'!N:N,"是")`,
    `=SUMIFS('全量案件明細'!I:I,'全量案件明細'!E:E,A${row},'全量案件明細'!N:N,"是")`,
    `=SUMIFS('全量案件明細'!L:L,'全量案件明細'!E:E,A${row},'全量案件明細'!N:N,"是")`,
  ];
});
byType.getRange(`F2:F${typeNames.length + 1}`).values = typeNames.map((t) => [
  t === "利他行動168" ? "金額採制度最高68萬元，上限估算" : t === "公有空間活化" ? "有效統計排除撤案" : "",
]);
byType.tables.add(`A1:F${typeNames.length + 1}`, true, "TypeSummaryTable").style = "TableStyleMedium4";
byType.getRange("A1:F1").format.font = { bold: true, color: "#FFFFFF" };
byType.getRange("A1:F1").format.fill = { color: "#548235" };
byType.getRange("D:E").setNumberFormat("#,##0");
byType.getRange("A:F").format.wrapText = true;
byType.getRange("A:A").format.columnWidthPx = 180;
byType.getRange("B:C").format.columnWidthPx = 90;
byType.getRange("D:E").format.columnWidthPx = 150;
byType.getRange("F:F").format.columnWidthPx = 260;

const townNames = [...new Set(cases.map((c) => c.township))].sort();
byTown.getRange("A1:E1").values = [["鄉鎮", "案件數", "有效案件數", "補助/獎勵金額合計", "提案/核定總經費合計"]];
byTown.getRange(`A2:A${townNames.length + 1}`).values = townNames.map((t) => [t]);
byTown.getRange(`B2:E${townNames.length + 1}`).formulas = townNames.map((_, idx) => {
  const row = idx + 2;
  return [
    `=COUNTIF('全量案件明細'!D:D,A${row})`,
    `=COUNTIFS('全量案件明細'!D:D,A${row},'全量案件明細'!N:N,"是")`,
    `=SUMIFS('全量案件明細'!I:I,'全量案件明細'!D:D,A${row},'全量案件明細'!N:N,"是")`,
    `=SUMIFS('全量案件明細'!L:L,'全量案件明細'!D:D,A${row},'全量案件明細'!N:N,"是")`,
  ];
});
byTown.tables.add(`A1:E${townNames.length + 1}`, true, "TownSummaryTable").style = "TableStyleMedium6";
byTown.getRange("A1:E1").format.font = { bold: true, color: "#FFFFFF" };
byTown.getRange("A1:E1").format.fill = { color: "#7030A0" };
byTown.getRange("D:E").setNumberFormat("#,##0");
byTown.getRange("A:E").format.wrapText = true;
byTown.getRange("A:A").format.columnWidthPx = 90;
byTown.getRange("B:C").format.columnWidthPx = 90;
byTown.getRange("D:E").format.columnWidthPx = 160;

const yearNames = [...new Set(cases.map((c) => c.year))].sort((a, b) => a - b);
byYear.getRange("A1:E1").values = [["年度", "案件數", "有效案件數", "補助/獎勵金額合計", "提案/核定總經費合計"]];
byYear.getRange(`A2:A${yearNames.length + 1}`).values = yearNames.map((y) => [y]);
byYear.getRange(`B2:E${yearNames.length + 1}`).formulas = yearNames.map((_, idx) => {
  const row = idx + 2;
  return [
    `=COUNTIF('全量案件明細'!A:A,A${row})`,
    `=COUNTIFS('全量案件明細'!A:A,A${row},'全量案件明細'!N:N,"是")`,
    `=SUMIFS('全量案件明細'!I:I,'全量案件明細'!A:A,A${row},'全量案件明細'!N:N,"是")`,
    `=SUMIFS('全量案件明細'!L:L,'全量案件明細'!A:A,A${row},'全量案件明細'!N:N,"是")`,
  ];
});
byYear.tables.add(`A1:E${yearNames.length + 1}`, true, "YearSummaryTable").style = "TableStyleMedium7";
byYear.getRange("A1:E1").format.font = { bold: true, color: "#FFFFFF" };
byYear.getRange("A1:E1").format.fill = { color: "#9E480E" };
byYear.getRange("D:E").setNumberFormat("#,##0");
byYear.getRange("A:E").format.columnWidthPx = 150;

summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["新竹縣地方創生通過案件全量統計"]];
summary.getRange("A1").format.font = { bold: true, size: 18, color: "#17365D" };
summary.getRange("A1").format.fill = { color: "#D9EAF7" };
summary.getRange("A1").format.rowHeightPx = 34;
summary.getRange("A3:C13").values = [
  ["統計項目", "數值", "口徑"],
  ["全量案件數", null, "含核定後撤案、上限估算與提案書金額"],
  ["有效案件數", null, "排除已撤案案件"],
  ["鄉鎮覆蓋數", null, "依有效案件統計"],
  ["計畫類型數", null, "依有效案件統計"],
  ["有效案件補助/獎勵金額合計", null, "I欄加總，含利他168上限估算"],
  ["嚴格核定補助/獎勵金額合計", null, "排除上限估算、排除提案書未公開核定者"],
  ["有效案件提案/核定總經費合計", null, "L欄加總，含鄉鎮提案總經費"],
  ["撤案案件數", null, "狀態含撤案"],
  ["上限估算案件數", null, "納入嚴格核定統計=否且非提案書未公開核定"],
  ["需續查核定公文案件數", null, "嚴格統計=否"],
];
summary.getRange("B4:B13").formulas = [
  ["=COUNTA('全量案件明細'!C2:C32)"],
  ['=COUNTIF(\'全量案件明細\'!N2:N32,"是")'],
  ['=COUNTA(UNIQUE(FILTER(\'全量案件明細\'!D2:D32,\'全量案件明細\'!N2:N32="是")))'],
  ['=COUNTA(UNIQUE(FILTER(\'全量案件明細\'!E2:E32,\'全量案件明細\'!N2:N32="是")))'],
  ['=SUMIF(\'全量案件明細\'!N2:N32,"是",\'全量案件明細\'!I2:I32)'],
  ['=SUMIFS(\'全量案件明細\'!I2:I32,\'全量案件明細\'!N2:N32,"是",\'全量案件明細\'!O2:O32,"是")'],
  ['=SUMIF(\'全量案件明細\'!N2:N32,"是",\'全量案件明細\'!L2:L32)'],
  ['=COUNTIF(\'全量案件明細\'!N2:N32,"否")'],
  ['=COUNTIFS(\'全量案件明細\'!E2:E32,"利他行動168",\'全量案件明細\'!N2:N32,"是")'],
  ['=COUNTIFS(\'全量案件明細\'!N2:N32,"是",\'全量案件明細\'!O2:O32,"否")'],
];
summary.getRange("A3:C3").format.font = { bold: true, color: "#FFFFFF" };
summary.getRange("A3:C3").format.fill = { color: "#1F4E79" };
summary.getRange("A3:C13").format.borders = { preset: "all", style: "thin", color: "#BFBFBF" };
summary.getRange("A:C").format.wrapText = true;
summary.getRange("A:A").format.columnWidthPx = 230;
summary.getRange("B:B").format.columnWidthPx = 150;
summary.getRange("C:C").format.columnWidthPx = 380;
summary.getRange("B9:B11").setNumberFormat("#,##0");
summary.getRange("B4:B8").setNumberFormat("0");
summary.getRange("B12:B13").setNumberFormat("0");

summary.getRange("E3:H3").values = [["排名", "類型", "有效案件數", "補助/獎勵金額合計"]];
summary.getRange("E4:H9").formulas = [
  ["=ROW()-3", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,1)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,3)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,4)"],
  ["=ROW()-3", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,1)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,3)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,4)"],
  ["=ROW()-3", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,1)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,3)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,4)"],
  ["=ROW()-3", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,1)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,3)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,4)"],
  ["=ROW()-3", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,1)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,3)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,4)"],
  ["=ROW()-3", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,1)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,3)", "=INDEX(SORT('類型統計'!A2:E7,3,-1),ROW()-3,4)"],
];
summary.getRange("E3:H3").format.font = { bold: true, color: "#FFFFFF" };
summary.getRange("E3:H3").format.fill = { color: "#548235" };
summary.getRange("E3:H9").format.borders = { preset: "all", style: "thin", color: "#BFBFBF" };
summary.getRange("E:E").format.columnWidthPx = 60;
summary.getRange("F:F").format.columnWidthPx = 190;
summary.getRange("G:G").format.columnWidthPx = 100;
summary.getRange("H:H").format.columnWidthPx = 160;
summary.getRange("H4:H9").setNumberFormat("#,##0");

const chart = summary.charts.add("bar", byType.getRange(`A1:D${typeNames.length + 1}`));
chart.setPosition("E11", "H28");
chart.title = "各類型有效案件補助/獎勵金額";
chart.hasLegend = false;
chart.xAxis = { axisType: "textAxis" };
chart.yAxis = { numberFormatCode: "#,##0" };

notes.getRange("A1:D1").values = [["項目", "本表處理方式", "影響", "後續查核建議"]];
notes.getRange("A2:D10").values = [
  ["全量定義", "納入新竹縣已通過、入選或核定之地方創生相關案件，含青培站、青年獎勵、利他168、公有空間、鄉鎮提案、多元徵件/會報案。", "不再只限鄉鎮公所提案與多元徵件。", "若要做到審計等級，需逐年度下載國發會PDF核定名單逐筆比對。"],
  ["年度重複/延續", "同團隊跨年度重新核定或延續補助者，以年度獨立案件計算。", "青培站數量會高於團隊數。", "可另製團隊主體去重表。"],
  ["撤案", "竹現靚行式．NeWow藝聚場列入全量案件，但不納入有效統計。", "全量與有效統計會相差1件。", "若只做『曾獲核定』可納入；若做『有效執行』應排除。"],
  ["利他168", "公開口徑為最高提供68萬元，本表以68萬元作上限估算，嚴格核定統計排除。", "有效金額合計會包含估算值。", "需查國發會或承辦單位核定函確認實支。"],
  ["平論文案", "公開國發會頁未列金額，本表採本機1150318提案書經費需求。", "嚴格核定統計排除，但有效總經費納入。", "需補第55次會議紀錄或各部會核定函。"],
  ["峨眉主案年度", "使用公開資料年度109，並註記原表列112。", "避免把案例年度與會報年度混淆。", "後續報告可另設『案例地圖年度』欄。"],
  ["大山橙黃橘綠時行政區", "API曾列北埔，依大山背場域修正為橫山鄉。", "鄉鎮統計採橫山。", "正式送件前用官方核定PDF再確認。"],
  ["金額單位", "全表以新台幣元計算，摘要可自行除以10,000轉為萬元。", "避免小數與四捨五入誤差。", ""],
  ["資料來源", "混合使用國發會/縣府公開資料、本機地創團隊資料庫、本機115年度新竹縣輔導案筆記與提案書。", "來源欄逐案列示。", "建議後續建立官方PDF附件索引。"],
];
notes.tables.add("A1:D10", true, "MethodNotesTable").style = "TableStyleMedium9";
notes.freezePanes.freezeRows(1);
notes.getRange("A1:D1").format.font = { bold: true, color: "#FFFFFF" };
notes.getRange("A1:D1").format.fill = { color: "#7030A0" };
notes.getRange("A:D").format.wrapText = true;
notes.getRange("A:A").format.columnWidthPx = 160;
notes.getRange("B:D").format.columnWidthPx = 330;
notes.getRange("A1:D10").format.borders = { preset: "all", style: "thin", color: "#E4DFEC" };

for (const sheet of [byType, byTown, byYear, notes]) {
  sheet.freezePanes.freezeRows(1);
}

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

const summaryInspect = await workbook.inspect({
  kind: "table",
  range: "摘要統計!A3:H13",
  include: "values,formulas",
  tableMaxRows: 14,
  tableMaxCols: 8,
});
console.log(summaryInspect.ndjson);

await workbook.render({ sheetName: "摘要統計", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "全量案件明細", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "類型統計", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "鄉鎮統計", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "年度統計", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "資料口徑與來源", autoCrop: "all", scale: 1, format: "png" });

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
