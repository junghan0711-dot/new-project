(function () {
  const config = window.TAOZHUMIAO_CONFIG || {};
  const embedded = window.TAOZHUMIAO_DATA || {};
  const state = {
    items: [],
    tasks: [],
    updates: [],
    expenses: [],
    cases: [],
    caseUpdates: [],
    localCaseUpdates: [],
    sheets: [],
    originalSheetCount: 0,
    filteredItems: [],
    filteredCases: [],
    selectedItemId: "",
    selectedSheetName: "",
    loading: false,
  };

  const $ = (id) => document.getElementById(id);
  const excludedPersonLabels = new Set(["主責", "協辦", "主責及協辦", "負責同仁", "各項主責同仁"]);
  const extraPeople = ["芷安", "昱碩"];

  function init() {
    $("sheetLink").href = config.sheetUrl || embedded.sourceUrl || "#";
    $("refreshButton").addEventListener("click", loadData);
    $("personFilter").addEventListener("change", applyFilters);
    $("statusFilter").addEventListener("change", applyFilters);
    $("searchInput").addEventListener("input", applyFilters);
    $("sourceSearchInput").addEventListener("input", renderSourceTable);
    $("progressForm").addEventListener("submit", submitProgress);
    $("caseForm").addEventListener("submit", submitCaseTracking);
    $("caseProgressForm").addEventListener("submit", submitCaseProgress);
    $("copyReportButton").addEventListener("click", copyManagementReport);
    $("caseAssigneeFilter").addEventListener("change", applyCaseFilters);
    $("caseStatusFilter").addEventListener("change", applyCaseFilters);
    $("casePriorityFilter").addEventListener("change", applyCaseFilters);
    $("caseOpenOnlyFilter").addEventListener("change", applyCaseFilters);
    $("caseSearchInput").addEventListener("input", applyCaseFilters);
    $("reporterInput").value = localStorage.getItem("taozhumiao.reporter") || "";
    $("reporterInput").addEventListener("input", (event) => {
      localStorage.setItem("taozhumiao.reporter", event.target.value.trim());
      if (!$("caseReporterInput").value.trim()) {
        $("caseReporterInput").value = event.target.value.trim();
      }
      if (!$("caseProgressReporterInput").value.trim()) {
        $("caseProgressReporterInput").value = event.target.value.trim();
      }
    });
    $("caseReporterInput").value = $("reporterInput").value;
    $("caseProgressReporterInput").value = $("reporterInput").value;
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });
    loadData();
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    $("refreshButton").disabled = isLoading;
    $("refreshButton").textContent = isLoading ? "讀取中" : "重新整理";
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `yunjianan_${Date.now()}_${Math.round(Math.random() * 100000)}`;
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";
      window[callbackName] = (payload) => {
        delete window[callbackName];
        script.remove();
        resolve(payload);
      };
      script.onerror = () => {
        delete window[callbackName];
        script.remove();
        reject(new Error("無法讀取 Google Sheets 資料"));
      };
      script.src = `${url}${separator}callback=${callbackName}`;
      document.body.appendChild(script);
    });
  }

  async function loadData() {
    setLoading(true);
    try {
      if (config.apiUrl) {
        const payload = await jsonp(`${config.apiUrl}?action=listData`);
        if (!payload || payload.ok === false) {
          throw new Error(payload && payload.error ? payload.error : "資料讀取失敗");
        }
        setData({
          items: payload.items || embedded.items || [],
          tasks: payload.tasks || embedded.tasks || [],
          updates: payload.updates || embedded.updates || [],
          expenses: payload.expenses || embedded.expenses || [],
          cases: payload.cases || embedded.cases || [],
          caseUpdates: payload.caseUpdates || embedded.caseUpdates || [],
          sheets: payload.sheets || embedded.sheets || [],
        });
        $("dataMode").textContent = "已連線";
      } else {
        setData(embedded);
        $("dataMode").textContent = "完整快照";
      }
      renderAll();
    } catch (error) {
      setData(embedded);
      $("dataMode").textContent = "快照備援";
      renderMessage(`讀取線上資料失敗，已使用完整快照：${error.message}`, "error");
      renderAll();
    } finally {
      setLoading(false);
    }
  }

  function setData(payload) {
    state.items = (payload.items || []).map(normalizeItem);
    state.tasks = (payload.tasks || []).map(normalizeTask);
    state.updates = payload.updates || [];
    state.expenses = payload.expenses || [];
    state.cases = (payload.cases || []).map(normalizeCase);
    state.caseUpdates = mergeCaseUpdates(payload.caseUpdates || [], state.localCaseUpdates);
    const originalSheets = payload.sheets && payload.sheets.length ? payload.sheets : [];
    state.originalSheetCount = originalSheets.length;
    state.sheets = buildOverviewSheets(originalSheets);
    const hasSelectedSheet = state.sheets.some((sheet) => sheet.name === state.selectedSheetName);
    state.selectedSheetName = hasSelectedSheet ? state.selectedSheetName : (state.sheets[0] && state.sheets[0].name) || "";
  }

  function mergeCaseUpdates(sourceUpdates, localUpdates) {
    const seen = new Set();
    return [...localUpdates, ...sourceUpdates].filter((record) => {
      const key = record.updateId || record["案件更新ID"] || [
        record.caseId || record["案件ID"],
        record.date || record["回報日期"],
        record.reporter || record["回報人"],
        record.progress || record["最新進度"],
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeItem(item) {
    return {
      itemId: item.itemId || item["工項ID"] || "",
      itemName: item.itemName || item["工作項目"] || "",
      performance: item.performance || item["執行績效及內容"] || item["履約標的及績效"] || "",
      budget: item.budget || item["核定/預估經費"] || item["經費"] || "",
      progressRatio: item.progressRatio || item["執行進度比例"] || item["工作進度"] || "",
      owner: item.owner || item["主責及協辦"] || "",
      coOwner: item.coOwner || item["協辦同仁"] || "",
      period: item.period || item["預計執行時程"] || "",
      schedule: item.schedule || item["表定時間摘要"] || item["工作執行時程規劃"] || "",
      currentStatus: item.currentStatus || item["執行現況說明"] || "",
      expenseNote: item.expenseNote || item["經費項目"] || item["費用說明"] || "",
      updatedBy: item.updatedBy || item["最後更新人"] || "",
      updatedAt: item.updatedAt || item["最後更新時間"] || "",
    };
  }

  function normalizeTask(task) {
    return {
      taskId: task.taskId || task["任務ID"] || "",
      itemId: task.itemId || task["工項ID"] || "",
      sourceSheet: task.sourceSheet || task["來源工作表"] || "",
      itemName: task.itemName || task["工項名稱"] || "",
      taskName: task.taskName || task["工作細項"] || "",
      owner: task.owner || task["負責同仁"] || "",
      dueDate: task.dueDate || task["預定完成日期"] || "",
      status: task.status || task["是否完成"] || "未確認",
      progress: task.progress || task["目前工作進度"] || "",
      expense: task.expense || task["費用"] || "",
      expenseDetail: task.expenseDetail || task["費用明細"] || "",
      note: task.note || task["備註/場地"] || task["備註"] || "",
      updatedBy: task.updatedBy || task["最後更新人"] || "",
      updatedAt: task.updatedAt || task["最後更新時間"] || "",
    };
  }

  function normalizeCase(record) {
    return {
      caseId: record.caseId || record["案件ID"] || "",
      title: record.title || record["案件名稱"] || "",
      assignee: record.assignee || record["指定同事"] || "",
      instruction: record.instruction || record["交辦內容"] || "",
      checkpoint: record.checkpoint || record["查核點"] || "",
      deadline: record.deadline || record["Deadline"] || record["期限"] || "",
      progress: record.progress || record["目前進度說明"] || record["進度說明"] || "",
      status: record.status || record["狀態"] || "待執行",
      priority: record.priority || record["優先序"] || "一般",
      reporter: record.reporter || record["回報人"] || "",
      reportedAt: record.reportedAt || record["回報時間"] || record["最後更新時間"] || "",
      note: record.note || record["備註"] || "",
      attachment: record.attachment || record["佐證資料連結"] || record["附件連結"] || "",
      completion: record.completion || record["完成/解除列管說明"] || record["完成說明"] || "",
      releasedAt: record.releasedAt || record["解除列管時間"] || "",
    };
  }

  function renderAll() {
    populatePeople();
    applyFilters();
    renderSheetTabs();
    renderSourceTable();
    renderRecords();
    renderManagement();
    populateCaseAssignees();
    populateCaseIds();
    applyCaseFilters();
    const meta = [
      `資料更新時間：${latestDataTime()}`,
      `即時彙整 5 張 / 原始快照 ${state.originalSheetCount} 張`,
      `${state.items.length} 筆工項 / ${state.tasks.length} 筆明細`,
    ];
    $("sourceMeta").textContent = meta.join(" / ");
  }

  function latestDataTime() {
    const times = [
      ...state.items.map((item) => item.updatedAt),
      ...state.tasks.map((task) => task.updatedAt),
      ...state.updates.map((record) => record.updatedAt || record["最後更新時間"]),
      ...state.cases.map((record) => record.reportedAt),
      ...state.caseUpdates.map((record) => record.reportedAt || record["回報日期"]),
    ].filter(Boolean);
    return times.length ? times[times.length - 1] : embedded.generatedAt || "未記錄";
  }

  function switchView(viewId) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    document.querySelectorAll(".view-section").forEach((section) => {
      section.classList.toggle("active", section.id === viewId);
    });
  }

  function populatePeople() {
    const select = $("personFilter");
    const currentValue = select.value;
    const names = new Set();
    extraPeople.forEach((name) => names.add(name));
    state.items.forEach((item) => splitNames(itemPeopleText(item)).forEach((name) => names.add(name)));
    state.tasks.forEach((task) => splitNames(task.owner).forEach((name) => names.add(name)));
    select.innerHTML = '<option value="">全部</option>';
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "zh-Hant"));
    sortedNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = sortedNames.includes(currentValue) ? currentValue : "";
  }

  function populateCaseAssignees() {
    const assigneeInput = $("caseAssigneeInput");
    const assigneeOptions = $("caseAssigneeOptions");
    const assigneeFilter = $("caseAssigneeFilter");
    const currentInput = assigneeInput.value;
    const currentFilter = assigneeFilter.value;
    const names = new Set();
    extraPeople.forEach((name) => names.add(name));
    state.items.forEach((item) => splitNames(itemPeopleText(item)).forEach((name) => names.add(name)));
    state.tasks.forEach((task) => splitNames(task.owner).forEach((name) => names.add(name)));
    state.cases.forEach((record) => {
      if (record.assignee) names.add(record.assignee);
    });
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "zh-Hant"));

    assigneeOptions.innerHTML = "";
    assigneeFilter.innerHTML = '<option value="">全部</option>';
    sortedNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      assigneeOptions.appendChild(option.cloneNode(true));
      assigneeFilter.appendChild(option);
    });
    assigneeInput.value = currentInput;
    assigneeFilter.value = sortedNames.includes(currentFilter) ? currentFilter : "";
  }

  function populateCaseIds() {
    const options = $("caseIdOptions");
    const currentValue = $("caseProgressIdInput").value;
    options.innerHTML = "";
    state.cases.forEach((record) => {
      if (!record.caseId) return;
      const option = document.createElement("option");
      option.value = record.caseId;
      option.textContent = `${record.caseId} / ${record.title || "未命名案件"} / ${record.assignee || "未指定"}`;
      options.appendChild(option);
    });
    $("caseProgressIdInput").value = currentValue;
  }

  function splitNames(value) {
    return String(value || "")
      .split(/[\n、,，/]+/)
      .map((name) => name.trim().replace(/\(.+?\)/g, ""))
      .filter((name) => name && !excludedPersonLabels.has(name));
  }

  function itemPeopleText(item) {
    return [item.owner, item.coOwner].filter(Boolean).join("、");
  }

  function findItemForTask(task) {
    return state.items.find((item) => item.itemId === task.itemId)
      || state.items.find((item) => item.itemName === task.itemName)
      || null;
  }

  function itemOwnerForTask(task) {
    const item = findItemForTask(task);
    return item && item.owner ? item.owner : "";
  }

  function displayNames(value) {
    return splitNames(value).join("、");
  }

  function buildOverviewSheets(originalSheets) {
    const liveSheets = [
      buildSheet("即時-工項主檔", [
        "工項ID",
        "工作項目",
        "主責及協辦",
        "預計執行時程",
        "執行進度比例",
        "核定/預估經費",
        "執行現況說明",
        "表定時間摘要",
        "經費項目",
        "最後更新人",
        "最後更新時間",
      ], state.items.map((item) => [
        item.itemId,
        item.itemName,
        displayNames(itemPeopleText(item)) || itemPeopleText(item),
        item.period,
        item.progressRatio,
        item.budget,
        item.currentStatus,
        item.schedule,
        item.expenseNote,
        item.updatedBy,
        item.updatedAt,
      ])),
      buildSheet("即時-進度更新紀錄", [
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
      ], state.updates.map((record) => [
        record.updateId || record["更新ID"],
        record.taskId || record["任務ID"],
        record.itemId || record["工項ID"],
        record.date || record["更新日期"],
        record.reporter || record["更新人"],
        record.progress || record["進度內容"],
        record.status || record["完成狀態"],
        record.nextDate || record["下次追蹤日期"],
        record.note || record["備註"],
        record.voucher || record["佐證資料連結"] || record["憑證連結"],
      ])),
      buildSheet("即時-經費支出紀錄", [
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
      ], state.expenses.map((record) => [
        record.expenseId || record["經費ID"],
        record.taskId || record["任務ID"],
        record.itemId || record["工項ID"],
        record.sourceSheet || record["來源工作表"] || record.itemName || record["工項名稱"],
        record.amount || record["金額"],
        record.detail || record["費用明細"],
        record.date || record["支出日期"],
        record.reporter || record["填報人"],
        record.voucher || record["憑證連結"],
        record.note || record["備註"],
      ])),
      buildSheet("即時-案件追蹤列管", [
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
      ], state.cases.map((record) => [
        record.caseId,
        record.title,
        record.assignee,
        record.instruction,
        record.checkpoint,
        record.deadline,
        record.progress,
        record.status,
        record.priority,
        record.reporter,
        record.reportedAt,
        record.note,
        record.attachment,
        record.completion,
        record.releasedAt,
      ])),
      buildSheet("即時-案件進度紀錄", [
        "案件更新ID",
        "案件ID",
        "回報日期",
        "回報人",
        "最新進度",
        "狀態",
        "完成/解除列管說明",
        "佐證資料連結",
        "備註",
      ], state.caseUpdates.map((record) => [
        record.updateId || record["案件更新ID"],
        record.caseId || record["案件ID"],
        record.date || record["回報日期"],
        record.reporter || record["回報人"],
        record.progress || record["最新進度"],
        record.status || record["狀態"],
        record.completion || record["完成/解除列管說明"],
        record.attachment || record["佐證資料連結"],
        record.note || record["備註"],
      ])),
    ];
    return [...liveSheets, ...originalSheets.map((sheet) => ({
      ...sheet,
      name: `原始-${sheet.name}`,
    }))];
  }

  function buildSheet(name, headers, dataRows) {
    return {
      name,
      headerRow: 1,
      maxColumn: headers.length,
      rows: [
        { rowNumber: 1, values: headers },
        ...dataRows.map((values, index) => ({
          rowNumber: index + 2,
          values,
        })),
      ],
    };
  }

  function applyFilters() {
    const person = $("personFilter").value;
    const status = $("statusFilter").value;
    const query = $("searchInput").value.trim().toLowerCase();
    state.filteredItems = state.items.filter((item) => {
      const matchesPerson = !person || splitNames(itemPeopleText(item)).includes(person);
      const matchesStatus = !status || itemStatus(item) === status;
      const haystack = [
        item.itemName,
        item.performance,
        item.owner,
        item.coOwner,
        item.period,
        item.schedule,
        item.currentStatus,
        item.expenseNote,
      ].join(" ").toLowerCase();
      return matchesPerson && matchesStatus && (!query || haystack.includes(query));
    });
    renderSummary();
    renderTasks();
  }

  function renderSummary() {
    const total = state.items.length;
    const done = state.items.filter((item) => itemStatus(item) === "已完成").length;
    $("totalTasks").textContent = total;
    $("doneTasks").textContent = done;
    $("openTasks").textContent = Math.max(total - done, 0);
    $("visibleCount").textContent = `${state.filteredItems.length} 筆`;
  }

  function renderTasks() {
    const list = $("taskList");
    const template = $("taskTemplate");
    list.innerHTML = "";
    if (!state.filteredItems.length) {
      const empty = document.createElement("p");
      empty.className = "task-meta";
      empty.textContent = "沒有符合條件的工項";
      list.appendChild(empty);
      return;
    }
    state.filteredItems.forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.itemId = item.itemId;
      node.classList.toggle("active", item.itemId === state.selectedItemId);
      node.querySelector(".task-title").textContent = item.itemName || "未命名工項";
      node.querySelector(".task-item").textContent = "總工項追蹤 / 工作項目";
      node.querySelector(".task-meta").textContent = [
        itemPeopleText(item) ? `主責及協辦：${displayNames(itemPeopleText(item)) || itemPeopleText(item).replace(/\n/g, "、")}` : "",
        item.period ? `時程：${item.period}` : "",
      ].filter(Boolean).join("  ");
      setStatusPill(node.querySelector(".task-status"), itemStatus(item));
      node.addEventListener("click", () => selectItem(item.itemId));
      list.appendChild(node);
    });
  }

  function itemStatus(item) {
    const rawProgress = String(item.progressRatio || "").trim();
    const isPercent = rawProgress.endsWith("%");
    const progress = Number(rawProgress.replace("%", ""));
    if (Number.isFinite(progress) && (isPercent ? progress >= 100 : progress >= 1)) return "已完成";
    if (Number.isFinite(progress) && progress > 0) return "進行中";
    if (item.currentStatus || item.schedule) return "進行中";
    return "未確認";
  }

  function setStatusPill(element, status) {
    const value = status || "未確認";
    element.textContent = value;
    element.classList.remove("done", "open", "unknown");
    if (value === "已完成") element.classList.add("done");
    else if (value === "未完成" || value === "進行中") element.classList.add("open");
    else element.classList.add("unknown");
  }

  function selectItem(itemId) {
    const item = state.items.find((entry) => entry.itemId === itemId);
    if (!item) return;
    state.selectedItemId = itemId;
    $("emptyState").classList.add("hidden");
    $("progressForm").classList.remove("hidden");
    $("selectedItem").textContent = "總工項追蹤 / 工作項目";
    $("selectedTask").textContent = item.itemName || "未命名工項";
    $("selectedOwner").textContent = displayNames(itemPeopleText(item)) || itemPeopleText(item) || "未填";
    $("selectedDue").textContent = item.period || "未填";
    $("selectedFee").textContent = formatMoney(item.budget);
    $("selectedProgressText").textContent = item.currentStatus || "未填";
    $("selectedSourceNote").textContent = [
      item.performance ? `履約內容：\n${item.performance}` : "",
      item.schedule ? `工作執行時程規劃：\n${item.schedule}` : "",
      item.expenseNote ? `經費說明：\n${item.expenseNote}` : "",
    ].filter(Boolean).join("\n\n") || "未填";
    setStatusPill($("selectedStatus"), itemStatus(item));
    $("progressInput").value = item.currentStatus || "";
    $("completeInput").value = statusOption(itemStatus(item));
    $("nextDateInput").value = "";
    $("expenseInput").value = "";
    $("expenseDetailInput").value = "";
    $("noteInput").value = "";
    $("voucherInput").value = "";
    renderMessage("", "");
    renderTasks();
  }

  function statusOption(status) {
    return ["未確認", "進行中", "未完成", "已完成"].includes(status) ? status : "未確認";
  }

  function formatMoney(value) {
    const numeric = Number(String(value || "").replace(/,/g, ""));
    if (!Number.isFinite(numeric) || numeric === 0) return value ? String(value) : "0";
    return numeric.toLocaleString("zh-TW");
  }

  function renderSheetTabs() {
    const container = $("sheetTabs");
    container.innerHTML = "";
    state.sheets.forEach((sheet) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sheet-tab";
      button.classList.toggle("active", sheet.name === state.selectedSheetName);
      button.textContent = `${sheet.name} (${(sheet.rows || []).length})`;
      button.addEventListener("click", () => {
        state.selectedSheetName = sheet.name;
        renderSheetTabs();
        renderSourceTable();
      });
      container.appendChild(button);
    });
  }

  function renderSourceTable() {
    const table = $("sourceTable");
    const query = $("sourceSearchInput").value.trim().toLowerCase();
    const sheet = state.sheets.find((item) => item.name === state.selectedSheetName) || state.sheets[0];
    table.innerHTML = "";
    if (!sheet) return;
    const rows = (sheet.rows || []).filter((row) => {
      if (!query) return true;
      return row.values.join(" ").toLowerCase().includes(query);
    });
    const visibleRows = rows.slice(0, 220);
    const maxColumn = Math.min(sheet.maxColumn || 12, 14);
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headRow.appendChild(headerCell("#"));
    for (let col = 1; col <= maxColumn; col += 1) headRow.appendChild(headerCell(columnName(col)));
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    visibleRows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.appendChild(rowHeaderCell(row.rowNumber));
      for (let col = 0; col < maxColumn; col += 1) {
        const td = document.createElement("td");
        td.textContent = row.values[col] == null ? "" : row.values[col];
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    if (rows.length > visibleRows.length) {
      const caption = document.createElement("caption");
      caption.textContent = `目前顯示前 ${visibleRows.length} 筆，請用搜尋縮小範圍。`;
      table.appendChild(caption);
    }
  }

  function headerCell(text) {
    const th = document.createElement("th");
    th.textContent = text;
    return th;
  }

  function rowHeaderCell(text) {
    const th = document.createElement("th");
    th.textContent = text;
    th.scope = "row";
    return th;
  }

  function columnName(index) {
    let name = "";
    let value = index;
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function renderRecords() {
    renderRecordList("updatesList", state.updates, (record) => ({
      title: `${record.taskId || record["任務ID"] || ""} ${record.status || record["完成狀態"] || ""}`,
      body: record.progress || record["進度內容"] || "",
      meta: [
        record.updateId || record["更新ID"],
        record.date || record["更新日期"],
        record.reporter || record["更新人"],
        record.note || record["備註"],
        record.voucher || record["佐證資料連結"] || record["憑證連結"],
      ].filter(Boolean).join(" / "),
    }));
    renderRecordList("expensesList", state.expenses, (record) => ({
      title: `${record.taskId || record["任務ID"] || ""} ${formatMoney(record.amount || record["金額"])}`,
      body: record.detail || record["費用明細"] || "",
      meta: [
        record.expenseId || record["經費ID"],
        record.sourceSheet || record["來源工作表"],
        record.date || record["支出日期"],
        record.reporter || record["填報人"],
        record.note || record["備註"],
      ].filter(Boolean).join(" / "),
    }));
    $("recordCount").textContent = `${state.updates.length + state.expenses.length} 筆`;
  }

  function renderManagement() {
    const metrics = managementMetrics();
    $("managementMetrics").innerHTML = "";
    [
      ["逾期案件", metrics.overdue],
      ["今日到期", metrics.today],
      ["3 日內到期", metrics.soon],
      ["待查核", metrics.awaitingReview],
      ["急件", metrics.urgent],
      ["近 7 日更新", metrics.recentUpdates],
      ["經費支出", formatMoney(metrics.expenseTotal)],
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "mini-metric";
      item.innerHTML = "<span></span><strong></strong>";
      item.querySelector("span").textContent = label;
      item.querySelector("strong").textContent = String(value);
      $("managementMetrics").appendChild(item);
    });

    const issues = qualityIssues();
    $("qualityIssues").innerHTML = "";
    if (!issues.length) {
      const empty = document.createElement("p");
      empty.className = "task-meta";
      empty.textContent = "目前沒有明顯資料品質提醒。";
      $("qualityIssues").appendChild(empty);
    } else {
      issues.slice(0, 16).forEach((issue) => {
        const article = document.createElement("article");
        article.className = `quality-item ${issue.level}`;
        article.innerHTML = "<strong></strong><p></p>";
        article.querySelector("strong").textContent = issue.title;
        article.querySelector("p").textContent = issue.detail;
        $("qualityIssues").appendChild(article);
      });
    }
    $("managementReport").value = buildManagementReport(metrics, issues);
  }

  function managementMetrics() {
    const openCases = state.cases.filter((record) => record.status !== "已完成");
    return {
      overdue: openCases.filter((record) => caseUrgency(record).level === "overdue").length,
      today: openCases.filter((record) => caseUrgency(record).level === "today").length,
      soon: openCases.filter((record) => caseUrgency(record).level === "soon").length,
      awaitingReview: openCases.filter((record) => record.status === "待查核").length,
      urgent: openCases.filter((record) => record.priority === "急件").length,
      recentUpdates: state.updates.filter((record) => isRecentRecord(record.date || record["更新日期"] || record.updatedAt || record["最後更新時間"], 7)).length,
      expenseTotal: state.expenses.reduce((sum, record) => sum + (Number(String(record.amount || record["金額"] || 0).replace(/,/g, "")) || 0), 0),
    };
  }

  function qualityIssues() {
    const issues = [];
    state.cases.forEach((record) => {
      const urgency = caseUrgency(record);
      if (urgency.level === "overdue") {
        issues.push({ level: "critical", title: "案件已逾期", detail: `${record.title || "未命名案件"} / ${record.assignee || "未指定"} / Deadline：${record.deadline}` });
      }
      if (record.status === "已完成" && !record.attachment) {
        issues.push({ level: "warning", title: "已完成案件缺佐證連結", detail: record.title || record.caseId || "未命名案件" });
      }
      if (!record.reporter) {
        issues.push({ level: "warning", title: "案件缺回報人", detail: record.title || record.caseId || "未命名案件" });
      }
    });
    state.updates.forEach((record) => {
      const status = record.status || record["完成狀態"];
      const progress = record.progress || record["進度內容"];
      const voucher = record.voucher || record["佐證資料連結"] || record["憑證連結"];
      if (status === "已完成" && !progress) {
        issues.push({ level: "warning", title: "已完成更新缺進度說明", detail: record.itemId || record["工項ID"] || record.updateId || record["更新ID"] || "未命名更新" });
      }
      if (status === "已完成" && !voucher) {
        issues.push({ level: "notice", title: "已完成更新可補佐證連結", detail: record.itemId || record["工項ID"] || record.updateId || record["更新ID"] || "未命名更新" });
      }
    });
    state.expenses.forEach((record) => {
      const amount = Number(String(record.amount || record["金額"] || 0).replace(/,/g, "")) || 0;
      const detail = record.detail || record["費用明細"];
      const voucher = record.voucher || record["憑證連結"] || record["佐證資料連結"];
      if (detail && amount <= 0) {
        issues.push({ level: "warning", title: "費用明細有填但金額為 0", detail: detail });
      }
      if (amount > 0 && !voucher) {
        issues.push({ level: "notice", title: "費用支出缺憑證連結", detail: `${record.itemId || record["工項ID"] || "未填工項"} / ${formatMoney(amount)}` });
      }
    });
    return issues;
  }

  function buildManagementReport(metrics, issues) {
    const openCases = state.cases.filter((record) => record.status !== "已完成");
    const topCases = [...openCases].sort(compareCases).slice(0, 5);
    return [
      `${config.projectName || "115 桃竹苗多元計畫"}進度摘要`,
      `資料時間：${latestDataTime()}`,
      "",
      `工項：${state.items.length} 筆，已完成 ${state.items.filter((item) => itemStatus(item) === "已完成").length} 筆，待追蹤 ${Math.max(state.items.length - state.items.filter((item) => itemStatus(item) === "已完成").length, 0)} 筆。`,
      `案件：逾期 ${metrics.overdue} 筆，今日到期 ${metrics.today} 筆，3 日內到期 ${metrics.soon} 筆，待查核 ${metrics.awaitingReview} 筆，急件 ${metrics.urgent} 筆。`,
      `近 7 日進度更新 ${metrics.recentUpdates} 筆，經費支出累計 ${formatMoney(metrics.expenseTotal)} 元。`,
      "",
      "優先追蹤：",
      ...(topCases.length ? topCases.map((record, index) => `${index + 1}. ${record.title || "未命名案件"} / ${record.assignee || "未指定"} / ${record.status || "未填狀態"} / ${record.deadline || "未填 Deadline"}`) : ["1. 目前沒有未完成案件。"]),
      "",
      "資料品質提醒：",
      ...(issues.length ? issues.slice(0, 5).map((issue, index) => `${index + 1}. ${issue.title}：${issue.detail}`) : ["1. 目前沒有明顯資料品質提醒。"]),
    ].join("\n");
  }

  function isRecentRecord(value, days) {
    const date = parseDeadline(value);
    if (!date) return false;
    const diff = new Date().getTime() - date.getTime();
    return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
  }

  function applyCaseFilters() {
    const assignee = $("caseAssigneeFilter").value;
    const status = $("caseStatusFilter").value;
    const priority = $("casePriorityFilter").value;
    const openOnly = $("caseOpenOnlyFilter").checked;
    const query = $("caseSearchInput").value.trim().toLowerCase();
    state.filteredCases = state.cases.filter((record) => {
      const matchesAssignee = !assignee || record.assignee === assignee;
      const matchesStatus = !status || record.status === status;
      const matchesPriority = !priority || record.priority === priority;
      const matchesOpenOnly = !openOnly || record.status !== "已完成";
      const haystack = [
        record.caseId,
        record.title,
        record.assignee,
        record.instruction,
        record.checkpoint,
        record.deadline,
        record.progress,
        record.status,
        record.priority,
        record.reporter,
        record.note,
        record.attachment,
      ].join(" ").toLowerCase();
      return matchesAssignee && matchesStatus && matchesPriority && matchesOpenOnly && (!query || haystack.includes(query));
    });
    renderCases();
  }

  function renderCases() {
    const list = $("caseList");
    list.innerHTML = "";
    $("caseCount").textContent = `${state.filteredCases.length} 筆`;
    if (!state.filteredCases.length) {
      const empty = document.createElement("p");
      empty.className = "task-meta";
      empty.textContent = "目前沒有符合條件的案件。";
      list.appendChild(empty);
      return;
    }
    [...state.filteredCases].sort(compareCases).slice(0, 160).forEach((record) => {
      const card = document.createElement("article");
      const urgency = caseUrgency(record);
      card.className = "case-card";
      if (urgency.level) card.classList.add(`case-${urgency.level}`);
      const status = document.createElement("span");
      status.className = "status-pill";
      setCaseStatusPill(status, record.status);
      card.appendChild(caseHeader(record, status, urgency));
      card.appendChild(caseBody(record));
      card.appendChild(caseMeta(record));
      list.appendChild(card);
    });
  }

  function caseHeader(record, status, urgency) {
    const header = document.createElement("div");
    header.className = "case-card-header";
    const title = document.createElement("div");
    title.className = "case-card-title";
    const strong = document.createElement("strong");
    strong.textContent = `${record.caseId ? `${record.caseId} ` : ""}${record.title || "未命名案件"}`;
    const span = document.createElement("span");
    span.textContent = [
      record.assignee ? `指定同事：${record.assignee}` : "",
      record.deadline ? `Deadline：${record.deadline}` : "",
      record.priority ? `優先序：${record.priority}` : "",
    ].filter(Boolean).join(" / ");
    title.appendChild(strong);
    title.appendChild(span);
    const statusStack = document.createElement("div");
    statusStack.className = "status-stack";
    statusStack.appendChild(status);
    if (urgency.label) {
      const deadline = document.createElement("span");
      deadline.className = `deadline-pill ${urgency.level}`;
      deadline.textContent = urgency.label;
      statusStack.appendChild(deadline);
    }
    const fillButton = document.createElement("button");
    fillButton.className = "button compact";
    fillButton.type = "button";
    fillButton.textContent = "回報此案";
    fillButton.addEventListener("click", () => fillCaseProgressForm(record));
    statusStack.appendChild(fillButton);
    header.appendChild(title);
    header.appendChild(statusStack);
    return header;
  }

  function compareCases(a, b) {
    const urgencyDiff = caseUrgency(b).rank - caseUrgency(a).rank;
    if (urgencyDiff) return urgencyDiff;
    const priorityDiff = casePriorityRank(b.priority) - casePriorityRank(a.priority);
    if (priorityDiff) return priorityDiff;
    const deadlineDiff = deadlineTime(a.deadline) - deadlineTime(b.deadline);
    if (deadlineDiff) return deadlineDiff;
    return String(b.reportedAt || "").localeCompare(String(a.reportedAt || ""), "zh-Hant");
  }

  function casePriorityRank(priority) {
    if (priority === "急件") return 3;
    if (priority === "高") return 2;
    if (priority === "一般") return 1;
    return 0;
  }

  function caseUrgency(record) {
    if (!record.deadline || record.status === "已完成") return { label: "", level: "", rank: 0 };
    const target = parseDeadline(record.deadline);
    if (!target) return { label: "", level: "", rank: 0 };
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const diff = target.getTime() - now.getTime();
    if (diff < 0) return { label: "已逾期", level: "overdue", rank: 4 };
    if (isSameLocalDate(target, now)) return { label: "今日到期", level: "today", rank: 3 };
    if (diff <= 3 * dayMs) return { label: "3 日內到期", level: "soon", rank: 2 };
    return { label: "", level: "", rank: 0 };
  }

  function parseDeadline(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    const normalized = text.includes("T") ? text : text.replace(" ", "T");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function deadlineTime(value) {
    const date = parseDeadline(value);
    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
  }

  function isSameLocalDate(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function isUrl(value) {
    return /^https?:\/\//.test(String(value || "").trim());
  }

  function caseUpdateValue(record, key, fallbackKey) {
    return record[key] || record[fallbackKey] || "";
  }

  function caseUpdatesFor(caseId) {
    return state.caseUpdates
      .filter((record) => caseUpdateValue(record, "caseId", "案件ID") === caseId)
      .sort((a, b) => String(caseUpdateValue(b, "date", "回報日期")).localeCompare(String(caseUpdateValue(a, "date", "回報日期")), "zh-Hant"))
      .slice(0, 3);
  }

  function caseBody(record) {
    const body = document.createElement("div");
    body.className = "case-card-body";
    [
      ["交辦內容", record.instruction],
      ["查核點", record.checkpoint],
      ["目前進度說明", record.progress],
      ["完成/解除列管說明", record.completion],
      ["備註", record.note],
      ["佐證資料連結", record.attachment],
    ].forEach(([label, value]) => {
      const field = document.createElement("div");
      field.className = "case-field";
      const span = document.createElement("span");
      span.textContent = label;
      const p = document.createElement("p");
      if (isUrl(value)) {
        const link = document.createElement("a");
        link.href = value;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "開啟佐證資料";
        p.appendChild(link);
      } else {
        p.textContent = value || "未填";
      }
      field.appendChild(span);
      field.appendChild(p);
      body.appendChild(field);
    });
    body.appendChild(caseUpdateHistory(record));
    return body;
  }

  function caseUpdateHistory(record) {
    const field = document.createElement("div");
    field.className = "case-field case-history-field";
    const span = document.createElement("span");
    span.textContent = "最新回報紀錄";
    field.appendChild(span);
    const updates = caseUpdatesFor(record.caseId);
    if (!updates.length) {
      const p = document.createElement("p");
      p.textContent = record.reportedAt
        ? `${record.reportedAt} / ${record.reporter || "未填回報人"} / ${record.status || "未填狀態"}\n${record.progress || "未填最新進度"}`
        : "尚無回報紀錄";
      field.appendChild(p);
      return field;
    }
    const list = document.createElement("div");
    list.className = "case-history-list";
    updates.forEach((update) => {
      const article = document.createElement("article");
      const meta = document.createElement("strong");
      meta.textContent = [
        caseUpdateValue(update, "date", "回報日期"),
        caseUpdateValue(update, "reporter", "回報人"),
        caseUpdateValue(update, "status", "狀態"),
      ].filter(Boolean).join(" / ");
      const progress = document.createElement("p");
      progress.textContent = caseUpdateValue(update, "progress", "最新進度") || "未填最新進度";
      article.appendChild(meta);
      article.appendChild(progress);
      list.appendChild(article);
    });
    field.appendChild(list);
    return field;
  }

  function caseMeta(record) {
    const meta = document.createElement("div");
    meta.className = "case-card-meta";
    meta.textContent = [
      record.caseId,
      record.reporter ? `回報人：${record.reporter}` : "",
      record.reportedAt ? `回報時間：${record.reportedAt}` : "",
    ].filter(Boolean).join(" / ");
    return meta;
  }

  function setCaseStatusPill(element, status) {
    const value = status || "待執行";
    element.textContent = value;
    element.classList.remove("done", "open", "unknown");
    if (value === "已完成") element.classList.add("done");
    else if (value === "進行中" || value === "待查核") element.classList.add("open");
    else element.classList.add("unknown");
  }

  function renderRecordList(id, records, mapper) {
    const list = $(id);
    list.innerHTML = "";
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "task-meta";
      empty.textContent = "目前沒有紀錄";
      list.appendChild(empty);
      return;
    }
    records.slice(0, 120).forEach((record) => {
      const data = mapper(record);
      const article = document.createElement("article");
      article.className = "record-card";
      article.innerHTML = `<strong></strong><p></p><span></span>`;
      article.querySelector("strong").textContent = data.title;
      article.querySelector("p").textContent = data.body || "未填";
      article.querySelector("span").textContent = data.meta || "";
      list.appendChild(article);
    });
  }

  function renderMessage(message, type) {
    const element = $("formMessage");
    element.textContent = message;
    element.className = type || "";
  }

  async function submitProgress(event) {
    event.preventDefault();
    const reporter = $("reporterInput").value.trim();
    const item = state.items.find((entry) => entry.itemId === state.selectedItemId);
    if (!reporter) {
      renderMessage("請先填寫填報人姓名。", "error");
      $("reporterInput").focus();
      return;
    }
    if (!item) {
      renderMessage("請先選擇工項。", "error");
      return;
    }
    if (!config.apiUrl) {
      renderMessage("目前尚未設定 Apps Script API URL，頁面可完整瀏覽資料，但不能寫入。", "error");
      return;
    }
    const payload = {
      action: "submitItemProgress",
      itemId: item.itemId,
      itemName: item.itemName,
      reporter,
      progress: $("progressInput").value.trim(),
      status: $("completeInput").value,
      nextDate: $("nextDateInput").value,
      expense: $("expenseInput").value,
      expenseDetail: $("expenseDetailInput").value.trim(),
      note: $("noteInput").value.trim(),
      voucher: $("voucherInput").value.trim(),
    };
    if (!confirmSubmission("請確認本次工項更新", [
      ["工項", item.itemName],
      ["填報人", reporter],
      ["完成狀態", payload.status],
      ["下次追蹤日期", payload.nextDate || "未填"],
      ["本次費用", payload.expense ? formatMoney(payload.expense) : "0"],
      ["佐證資料連結", payload.voucher || "未填"],
    ])) return;
    $("submitButton").disabled = true;
    renderMessage("送出中...", "");
    try {
      await postNoCors(config.apiUrl, payload);
      renderMessage("已送出更新。系統會重新讀取最新資料。", "success");
      await wait(900);
      await loadData();
      selectItem(item.itemId);
    } catch (error) {
      renderMessage(`送出失敗：${error.message}`, "error");
    } finally {
      $("submitButton").disabled = false;
    }
  }

  async function submitCaseTracking(event) {
    event.preventDefault();
    if (!config.apiUrl) {
      renderCaseMessage("目前尚未設定 Apps Script API URL，無法寫入案件列管。", "error");
      return;
    }
    const reporter = $("caseReporterInput").value.trim() || $("reporterInput").value.trim();
    if (!reporter) {
      renderCaseMessage("請填寫回報人。", "error");
      $("caseReporterInput").focus();
      return;
    }
    const payload = {
      action: "submitCaseTracking",
      title: $("caseTitleInput").value.trim(),
      assignee: $("caseAssigneeInput").value,
      deadline: $("caseDeadlineInput").value,
      status: $("caseStatusInput").value,
      instruction: $("caseInstructionInput").value.trim(),
      checkpoint: $("caseCheckpointInput").value.trim(),
      progress: $("caseProgressInput").value.trim(),
      reporter,
      priority: $("casePriorityInput").value,
      note: $("caseNoteInput").value.trim(),
      attachment: $("caseAttachmentInput").value.trim(),
      completion: "",
    };
    if (!confirmSubmission("請確認本次案件列管", [
      ["案件名稱", payload.title],
      ["指定同事", payload.assignee],
      ["Deadline", payload.deadline],
      ["狀態", payload.status],
      ["優先序", payload.priority],
      ["回報人", reporter],
      ["佐證資料連結", payload.attachment || "未填"],
    ])) return;
    $("caseSubmitButton").disabled = true;
    renderCaseMessage("送出中...", "");
    try {
      await postNoCors(config.apiUrl, payload);
      renderCaseMessage("已送出列管紀錄。系統會重新讀取最新資料。", "success");
      $("caseForm").reset();
      $("caseReporterInput").value = reporter;
      await wait(900);
      await loadData();
    } catch (error) {
      renderCaseMessage(`送出失敗：${error.message}`, "error");
    } finally {
      $("caseSubmitButton").disabled = false;
    }
  }

  async function submitCaseProgress(event) {
    event.preventDefault();
    if (!config.apiUrl) {
      renderCaseProgressMessage("目前尚未設定 Apps Script API URL，無法寫入案件進度。", "error");
      return;
    }
    const caseId = $("caseProgressIdInput").value.trim();
    const reporter = $("caseProgressReporterInput").value.trim() || $("reporterInput").value.trim();
    const status = $("caseProgressStatusInput").value;
    const completion = $("caseCompletionInput").value.trim();
    const record = state.cases.find((entry) => entry.caseId === caseId);
    if (!record) {
      renderCaseProgressMessage("請輸入既有案件編號。", "error");
      $("caseProgressIdInput").focus();
      return;
    }
    if (!reporter) {
      renderCaseProgressMessage("請填寫回報人。", "error");
      $("caseProgressReporterInput").focus();
      return;
    }
    if (status === "已完成" && !completion) {
      renderCaseProgressMessage("解除列管前請填寫完成內容與解除列管說明。", "error");
      $("caseCompletionInput").focus();
      return;
    }
    const payload = {
      action: "submitCaseProgress",
      caseId,
      reporter,
      status,
      progress: $("caseProgressUpdateInput").value.trim(),
      completion,
      attachment: $("caseProgressAttachmentInput").value.trim(),
      note: $("caseProgressNoteInput").value.trim(),
    };
    if (!confirmSubmission("請確認本次案件進度", [
      ["案件編號", payload.caseId],
      ["案件名稱", record.title],
      ["指定同事", record.assignee],
      ["狀態", payload.status],
      ["回報人", reporter],
      ["完成/解除列管說明", payload.completion || "未填"],
    ])) return;
    $("caseProgressSubmitButton").disabled = true;
    renderCaseProgressMessage("送出中...", "");
    try {
      await postNoCors(config.apiUrl, payload);
      applyLocalCaseProgress(payload);
      renderCaseProgressMessage("已送出案件進度，畫面已先更新最新回報紀錄。系統會重新讀取 Google Sheet。", "success");
      $("caseProgressForm").reset();
      $("caseProgressReporterInput").value = reporter;
      await wait(900);
      await loadData();
    } catch (error) {
      renderCaseProgressMessage(`送出失敗：${error.message}`, "error");
    } finally {
      $("caseProgressSubmitButton").disabled = false;
    }
  }

  function fillCaseProgressForm(record) {
    $("caseProgressIdInput").value = record.caseId;
    $("caseProgressReporterInput").value = $("reporterInput").value.trim() || record.assignee || "";
    $("caseProgressStatusInput").value = ["進行中", "待查核", "已完成"].includes(record.status) ? record.status : "進行中";
    $("caseProgressUpdateInput").value = record.progress || "";
    $("caseProgressAttachmentInput").value = record.attachment || "";
    $("caseCompletionInput").value = record.completion || "";
    $("caseProgressNoteInput").value = "";
    renderCaseProgressMessage("", "");
    $("caseProgressUpdateInput").focus();
  }

  function applyLocalCaseProgress(payload) {
    const timestamp = localTimestamp();
    const update = {
      updateId: `LOCAL-${payload.caseId}-${Date.now()}`,
      caseId: payload.caseId,
      date: timestamp.slice(0, 10),
      reporter: payload.reporter,
      progress: payload.progress,
      status: payload.status,
      completion: payload.completion,
      attachment: payload.attachment,
      note: payload.note,
    };
    state.localCaseUpdates.unshift(update);
    state.caseUpdates = mergeCaseUpdates(state.caseUpdates, state.localCaseUpdates);
    const record = state.cases.find((entry) => entry.caseId === payload.caseId);
    if (record) {
      record.progress = payload.progress;
      record.status = payload.status;
      record.reporter = payload.reporter;
      record.reportedAt = timestamp;
      if (payload.attachment) record.attachment = payload.attachment;
      if (payload.note) record.note = payload.note;
      if (payload.status === "已完成") {
        record.completion = payload.completion || payload.progress;
        record.releasedAt = timestamp;
      }
    }
    renderAll();
  }

  function localTimestamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
    ].join("-") + " " + [
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join(":");
  }

  function renderCaseMessage(message, type) {
    const element = $("caseFormMessage");
    element.textContent = message;
    element.className = type || "";
  }

  function renderCaseProgressMessage(message, type) {
    const element = $("caseProgressMessage");
    element.textContent = message;
    element.className = type || "";
  }

  async function copyManagementReport() {
    const text = $("managementReport").value;
    try {
      await navigator.clipboard.writeText(text);
      $("copyReportButton").textContent = "已複製";
      setTimeout(() => {
        $("copyReportButton").textContent = "複製摘要";
      }, 1200);
    } catch (error) {
      $("managementReport").select();
      document.execCommand("copy");
    }
  }

  function confirmSubmission(title, fields) {
    const summary = fields
      .map(([label, value]) => `${label}：${value || "未填"}`)
      .join("\n");
    return window.confirm(`${title}\n\n${summary}\n\n確認送出？`);
  }

  function postNoCors(url, payload) {
    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) => data.append(key, value == null ? "" : value));
    return fetch(url, {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      body: data,
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  init();
})();
