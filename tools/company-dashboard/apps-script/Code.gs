const ALLOWED_EMAILS = [
  "junghan0711@gmail.com",
];

const PROJECTS = [
  {
    id: "yunjianan",
    name: "115 雲嘉南多元計畫",
    office: "雲嘉南",
    spreadsheetId: "1jF8XdfhtbOI22kJ0GbAU69-NuWHQLAgHLQMIhhynSF0",
    pageUrl: "https://junghan0711-dot.github.io/new-project/tools/yunjianan-progress/",
  },
  {
    id: "taozhumiao",
    name: "115 桃竹苗多元計畫",
    office: "桃竹苗",
    spreadsheetId: "1_vblpEZtfs7oj7yH2EXzOUMZYI_8OmG9hdc4ASQd3e8",
    pageUrl: "https://junghan0711-dot.github.io/new-project/tools/taozhumiao-progress/",
  },
];

const SHEETS = {
  items: ["工項主檔", "工項總表"],
  updates: ["進度更新紀錄"],
  expenses: ["經費支出紀錄"],
  cases: ["案件追蹤列管"],
  caseUpdates: ["案件進度紀錄"],
  consultations: ["諮詢輔導場次"],
};

function doGet() {
  const auth = currentAuth_();
  const template = HtmlService.createTemplateFromFile("Index");
  template.initialAuth = JSON.stringify(auth);
  return template
    .evaluate()
    .setTitle("公司專案總控台")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getDashboardData() {
  const auth = currentAuth_();
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.message,
      auth,
    };
  }

  const projects = PROJECTS.map((project) => summarizeProject_(project));
  const totals = summarizeCompany_(projects);
  return {
    ok: true,
    viewer: auth.email,
    generatedAt: nowText_(),
    totals,
    projects,
    followUps: collectFollowUps_(projects),
    people: collectPeople_(projects),
    issues: collectIssues_(projects),
  };
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function currentAuth_() {
  const email = (Session.getActiveUser().getEmail() || "").toLowerCase();
  const allowed = ALLOWED_EMAILS.map((value) => String(value || "").toLowerCase()).filter(Boolean);
  if (!email) {
    return {
      ok: false,
      email: "",
      message: "無法辨識登入帳號。請確認 Web App 部署不是任何人匿名，且已用 Google 帳號登入。",
    };
  }
  if (allowed.indexOf(email) < 0) {
    return {
      ok: false,
      email,
      message: "此 Google 帳號未列入公司總控台白名單。",
    };
  }
  return {
    ok: true,
    email,
    message: "authorized",
  };
}

function summarizeProject_(project) {
  const spreadsheet = SpreadsheetApp.openById(project.spreadsheetId);
  const items = readRecords_(spreadsheet, SHEETS.items);
  const updates = readRecords_(spreadsheet, SHEETS.updates);
  const expenses = readRecords_(spreadsheet, SHEETS.expenses);
  const cases = readRecords_(spreadsheet, SHEETS.cases);
  const caseUpdates = readRecords_(spreadsheet, SHEETS.caseUpdates);
  const consultations = readRecords_(spreadsheet, SHEETS.consultations);
  const itemSummaries = items.map((item) => summarizeItem_(item, updates));
  const caseSummaries = cases.map((record) => summarizeCase_(record, caseUpdates));
  const people = summarizePeople_(itemSummaries, updates);
  const metrics = projectMetrics_(itemSummaries, updates, expenses, caseSummaries, consultations);
  const status = projectStatus_(metrics);

  return {
    id: project.id,
    name: project.name,
    office: project.office,
    pageUrl: project.pageUrl,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${project.spreadsheetId}`,
    status,
    metrics,
    people,
    followUps: projectFollowUps_(itemSummaries, caseSummaries),
    issues: projectIssues_(itemSummaries, expenses, caseSummaries, consultations),
    recentUpdates: recentUpdates_(updates),
    consultations: summarizeConsultations_(consultations),
    latestDataTime: latestDataTime_(itemSummaries, updates, cases, caseUpdates, consultations),
  };
}

function readRecords_(spreadsheet, names) {
  const sheet = names.map((name) => spreadsheet.getSheetByName(name)).find(Boolean);
  if (!sheet) return [];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => rowToObject_(headers, row));
}

function rowToObject_(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = row[index] || "";
    return record;
  }, {});
}

function summarizeItem_(item, updates) {
  const itemId = value_(item, ["工項ID"]);
  const owner = value_(item, ["主責及協辦", "主責同仁", "負責同仁"]);
  const latest = latestUpdateForItem_(itemId, updates);
  const status = itemStatus_(item, latest);
  return {
    itemId,
    name: value_(item, ["工作項目", "工項名稱"]),
    owner,
    period: value_(item, ["預計執行時程"]),
    status,
    progress: value_(item, ["執行進度比例", "工作進度"]),
    currentStatus: value_(item, ["執行現況說明", "目前工作進度"]),
    latestDate: latest.date || value_(item, ["最後更新時間"]),
    latestReporter: latest.reporter || value_(item, ["最後更新人"]),
    latestProgress: latest.progress,
    needsFollowUp: status !== "已完成" && !isRecent_(latest.date || value_(item, ["最後更新時間"]), 7),
  };
}

function latestUpdateForItem_(itemId, updates) {
  let latest = {};
  updates.forEach((record, index) => {
    if (value_(record, ["工項ID"]) !== itemId) return;
    const candidate = {
      date: value_(record, ["更新日期", "最後更新時間"]),
      reporter: value_(record, ["更新人", "填報人"]),
      progress: value_(record, ["進度內容"]),
      status: value_(record, ["完成狀態", "狀態"]),
      index,
    };
    if (!latest.date || compareDate_(candidate.date, latest.date) >= 0 || candidate.index > (latest.index || 0)) {
      latest = candidate;
    }
  });
  return latest;
}

function itemStatus_(item, latest) {
  const latestStatus = latest.status || "";
  if (["未確認", "進行中", "未完成", "已完成"].indexOf(latestStatus) >= 0) return latestStatus;
  const raw = String(value_(item, ["執行進度比例", "工作進度"]) || "").trim();
  const numeric = Number(raw.replace("%", ""));
  if (Number.isFinite(numeric) && (raw.endsWith("%") ? numeric >= 100 : numeric >= 1)) return "已完成";
  if (Number.isFinite(numeric) && numeric > 0) return "進行中";
  if (value_(item, ["執行現況說明", "表定時間摘要", "工作執行時程規劃"])) return "進行中";
  return "未確認";
}

function summarizeCase_(record, updates) {
  const caseId = value_(record, ["案件ID"]);
  const deadline = value_(record, ["Deadline", "期限"]);
  const status = value_(record, ["狀態"]) || "待執行";
  const urgency = caseUrgency_(deadline, status);
  const latest = latestCaseUpdate_(caseId, updates);
  return {
    caseId,
    title: value_(record, ["案件名稱"]),
    assignee: value_(record, ["指定同事"]),
    deadline,
    status,
    priority: value_(record, ["優先序"]) || "一般",
    reporter: latest.reporter || value_(record, ["回報人"]),
    reportedAt: latest.date || value_(record, ["回報時間"]),
    progress: latest.progress || value_(record, ["目前進度說明"]),
    completion: value_(record, ["完成/解除列管說明"]),
    attachment: value_(record, ["佐證資料連結", "附件連結"]),
    urgency,
  };
}

function latestCaseUpdate_(caseId, updates) {
  let latest = {};
  updates.forEach((record, index) => {
    if (value_(record, ["案件ID"]) !== caseId) return;
    const candidate = {
      date: value_(record, ["回報日期"]),
      reporter: value_(record, ["回報人"]),
      progress: value_(record, ["最新進度"]),
      status: value_(record, ["狀態"]),
      index,
    };
    if (!latest.date || compareDate_(candidate.date, latest.date) >= 0 || candidate.index > (latest.index || 0)) {
      latest = candidate;
    }
  });
  return latest;
}

function projectMetrics_(items, updates, expenses, cases, consultations) {
  const openCases = cases.filter((record) => record.status !== "已完成");
  const expenseTotal = expenses.reduce((sum, record) => {
    const amount = Number(String(value_(record, ["金額"]) || "0").replace(/,/g, "")) || 0;
    return sum + amount;
  }, 0);
  return {
    items: items.length,
    doneItems: items.filter((item) => item.status === "已完成").length,
    openItems: items.filter((item) => item.status !== "已完成").length,
    needsFollowUp: items.filter((item) => item.needsFollowUp).length,
    recentUpdates: updates.filter((record) => isRecent_(value_(record, ["更新日期", "最後更新時間"]), 7)).length,
    openCases: openCases.length,
    overdueCases: openCases.filter((record) => record.urgency.level === "overdue").length,
    dueTodayCases: openCases.filter((record) => record.urgency.level === "today").length,
    dueSoonCases: openCases.filter((record) => record.urgency.level === "soon").length,
    awaitingReview: openCases.filter((record) => record.status === "待查核").length,
    urgentCases: openCases.filter((record) => record.priority === "急件").length,
    expenseTotal,
    expensesMissingVoucher: expenses.filter((record) => {
      const amount = Number(String(value_(record, ["金額"]) || "0").replace(/,/g, "")) || 0;
      return amount > 0 && !value_(record, ["憑證連結", "佐證資料連結"]);
    }).length,
    consultations: consultations.length,
    consultationsThisMonth: consultations.filter((record) => sameMonth_(value_(record, ["月份", "輔導日期"]))).length,
  };
}

function projectStatus_(metrics) {
  if (metrics.overdueCases > 0 || metrics.needsFollowUp >= 5) return "red";
  if (metrics.dueTodayCases > 0 || metrics.dueSoonCases > 0 || metrics.awaitingReview > 0 || metrics.expensesMissingVoucher > 0) return "yellow";
  return "green";
}

function summarizeCompany_(projects) {
  return projects.reduce((total, project) => {
    Object.keys(project.metrics).forEach((key) => {
      total[key] = (total[key] || 0) + (Number(project.metrics[key]) || 0);
    });
    total.redProjects += project.status === "red" ? 1 : 0;
    total.yellowProjects += project.status === "yellow" ? 1 : 0;
    total.greenProjects += project.status === "green" ? 1 : 0;
    return total;
  }, {
    projects: projects.length,
    redProjects: 0,
    yellowProjects: 0,
    greenProjects: 0,
  });
}

function summarizePeople_(items, updates) {
  const map = {};
  items.forEach((item) => {
    splitNames_(item.owner).forEach((name) => {
      if (!map[name]) {
        map[name] = {
          name,
          total: 0,
          done: 0,
          needsFollowUp: 0,
          recentUpdates: 0,
          latestDate: "",
          latestReporter: "",
        };
      }
      map[name].total += 1;
      if (item.status === "已完成") map[name].done += 1;
      if (item.needsFollowUp) map[name].needsFollowUp += 1;
      if (isRecent_(item.latestDate, 7)) map[name].recentUpdates += 1;
      if (compareDate_(item.latestDate, map[name].latestDate) > 0) {
        map[name].latestDate = item.latestDate;
        map[name].latestReporter = item.latestReporter;
      }
    });
  });
  return Object.keys(map).map((key) => map[key]).sort((a, b) => {
    if (b.needsFollowUp !== a.needsFollowUp) return b.needsFollowUp - a.needsFollowUp;
    return a.name.localeCompare(b.name, "zh-Hant");
  });
}

function projectFollowUps_(items, cases) {
  const itemFollowUps = items
    .filter((item) => item.needsFollowUp)
    .map((item) => ({
      type: "工項",
      title: item.name,
      assignee: item.owner,
      status: item.status,
      date: item.latestDate,
      reason: item.latestDate ? "超過 7 天未更新" : "尚無更新紀錄",
    }));
  const caseFollowUps = cases
    .filter((record) => record.status !== "已完成" && record.urgency.level)
    .map((record) => ({
      type: "案件",
      title: record.title,
      assignee: record.assignee,
      status: record.status,
      date: record.deadline,
      reason: record.urgency.label,
    }));
  return itemFollowUps.concat(caseFollowUps).slice(0, 30);
}

function projectIssues_(items, expenses, cases, consultations) {
  const issues = [];
  cases.forEach((record) => {
    if (record.urgency.level === "overdue") {
      issues.push({ level: "critical", title: "案件已逾期", detail: `${record.title || record.caseId} / ${record.assignee || "未指定"}` });
    }
    if (record.status === "已完成" && !record.attachment) {
      issues.push({ level: "warning", title: "已完成案件缺佐證", detail: record.title || record.caseId });
    }
  });
  expenses.forEach((record) => {
    const amount = Number(String(value_(record, ["金額"]) || "0").replace(/,/g, "")) || 0;
    if (amount > 0 && !value_(record, ["憑證連結", "佐證資料連結"])) {
      issues.push({ level: "notice", title: "費用支出缺憑證", detail: `${value_(record, ["來源工作表/工項", "工項名稱", "工項ID"]) || "未填工項"} / ${formatMoney_(amount)}` });
    }
  });
  consultations.forEach((record) => {
    if (value_(record, ["狀態"]) === "已完成" && !value_(record, ["佐證資料連結"])) {
      issues.push({ level: "notice", title: "已完成諮詢輔導缺佐證", detail: value_(record, ["單位名稱"]) || value_(record, ["場次ID"]) });
    }
  });
  items.filter((item) => item.needsFollowUp).slice(0, 8).forEach((item) => {
    issues.push({ level: "warning", title: "工項需追蹤", detail: `${item.name || item.itemId} / ${item.owner || "未填主責"}` });
  });
  return issues.slice(0, 30);
}

function recentUpdates_(updates) {
  return updates
    .filter((record) => isRecent_(value_(record, ["更新日期", "最後更新時間"]), 14))
    .map((record) => ({
      date: value_(record, ["更新日期", "最後更新時間"]),
      reporter: value_(record, ["更新人", "填報人"]),
      itemId: value_(record, ["工項ID"]),
      progress: value_(record, ["進度內容"]),
      status: value_(record, ["完成狀態"]),
    }))
    .slice(0, 20);
}

function summarizeConsultations_(records) {
  return {
    total: records.length,
    thisMonth: records.filter((record) => sameMonth_(value_(record, ["月份", "輔導日期"]))).length,
    planned: records.filter((record) => value_(record, ["狀態"]) === "預排").length,
    confirmed: records.filter((record) => value_(record, ["狀態"]) === "已確認").length,
    done: records.filter((record) => value_(record, ["狀態"]) === "已完成").length,
  };
}

function collectFollowUps_(projects) {
  return projects
    .flatMap((project) => project.followUps.map((item) => ({ ...item, project: project.name, projectId: project.id, pageUrl: project.pageUrl })))
    .sort((a, b) => urgencyRank_(b.reason) - urgencyRank_(a.reason))
    .slice(0, 40);
}

function collectPeople_(projects) {
  const map = {};
  projects.forEach((project) => {
    project.people.forEach((person) => {
      if (!map[person.name]) {
        map[person.name] = {
          name: person.name,
          total: 0,
          done: 0,
          needsFollowUp: 0,
          recentUpdates: 0,
          projects: [],
          latestDate: "",
        };
      }
      map[person.name].total += person.total;
      map[person.name].done += person.done;
      map[person.name].needsFollowUp += person.needsFollowUp;
      map[person.name].recentUpdates += person.recentUpdates;
      map[person.name].projects.push(project.office);
      if (compareDate_(person.latestDate, map[person.name].latestDate) > 0) map[person.name].latestDate = person.latestDate;
    });
  });
  return Object.keys(map).map((key) => ({
    ...map[key],
    projects: [...new Set(map[key].projects)].join("、"),
  })).sort((a, b) => {
    if (b.needsFollowUp !== a.needsFollowUp) return b.needsFollowUp - a.needsFollowUp;
    return a.name.localeCompare(b.name, "zh-Hant");
  });
}

function collectIssues_(projects) {
  return projects
    .flatMap((project) => project.issues.map((issue) => ({ ...issue, project: project.name, projectId: project.id, pageUrl: project.pageUrl })))
    .slice(0, 60);
}

function latestDataTime_(items, updates, cases, caseUpdates, consultations) {
  const times = []
    .concat(items.map((item) => item.latestDate))
    .concat(updates.map((record) => value_(record, ["更新日期", "最後更新時間"])))
    .concat(cases.map((record) => value_(record, ["回報時間", "最後更新時間"])))
    .concat(caseUpdates.map((record) => value_(record, ["回報日期"])))
    .concat(consultations.map((record) => value_(record, ["最後更新時間", "建立時間", "輔導日期"])))
    .filter(Boolean);
  if (!times.length) return "";
  return times.reduce((latest, value) => compareDate_(value, latest) >= 0 ? value : latest, times[0]);
}

function caseUrgency_(value, status) {
  if (!value || status === "已完成") return { label: "", level: "", rank: 0 };
  const date = parseDate_(value);
  if (!date) return { label: "", level: "", rank: 0 };
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return { label: "已逾期", level: "overdue", rank: 4 };
  if (sameLocalDate_(date, now)) return { label: "今日到期", level: "today", rank: 3 };
  if (diff <= 3 * 24 * 60 * 60 * 1000) return { label: "3 日內到期", level: "soon", rank: 2 };
  return { label: "", level: "", rank: 0 };
}

function value_(record, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    if (record[keys[i]]) return record[keys[i]];
  }
  return "";
}

function splitNames_(value) {
  return String(value || "")
    .split(/[\n、,，/]+/)
    .map((name) => name.trim().replace(/\(.+?\)/g, ""))
    .filter((name) => name && ["主責", "協辦", "主責及協辦", "負責同仁"].indexOf(name) < 0);
}

function isRecent_(value, days) {
  const date = parseDate_(value);
  if (!date) return false;
  const diff = new Date().getTime() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function sameMonth_(value) {
  const text = String(value || "");
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return text.startsWith(month) || text.replace("/", "-").startsWith(month);
}

function parseDate_(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const normalized = text.includes("T") ? text : text.replace(" ", "T").replace(/\//g, "-");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compareDate_(a, b) {
  const left = parseDate_(a);
  const right = parseDate_(b);
  return (left ? left.getTime() : 0) - (right ? right.getTime() : 0);
}

function sameLocalDate_(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function urgencyRank_(reason) {
  if (reason === "已逾期") return 4;
  if (reason === "今日到期") return 3;
  if (reason === "3 日內到期") return 2;
  return 1;
}

function formatMoney_(value) {
  return Number(value || 0).toLocaleString("zh-TW");
}

function nowText_() {
  return Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
}

