(function () {
  const config = window.YUNJIANAN_CONFIG || window.TAOZHUMIAO_CONFIG || {};
  const embedded = window.YUNJIANAN_DATA || {};
  const state = {
    items: [],
    tasks: [],
    updates: [],
    expenses: [],
    sheets: [],
    filteredItems: [],
    selectedItemId: "",
    selectedSheetName: "",
    loading: false,
  };

  const $ = (id) => document.getElementById(id);
  const excludedPersonLabels = new Set(["主責", "協辦", "主責及協辦", "負責同仁", "各項主責同仁"]);

  function init() {
    $("sheetLink").href = embedded.sourceUrl || config.sheetUrl || "#";
    $("refreshButton").addEventListener("click", loadData);
    $("personFilter").addEventListener("change", applyFilters);
    $("statusFilter").addEventListener("change", applyFilters);
    $("searchInput").addEventListener("input", applyFilters);
    $("sourceSearchInput").addEventListener("input", renderSourceTable);
    $("progressForm").addEventListener("submit", submitProgress);
    $("reporterInput").value = localStorage.getItem("yunjianan.reporter") || "";
    $("reporterInput").addEventListener("input", (event) => {
      localStorage.setItem("yunjianan.reporter", event.target.value.trim());
    });
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
    state.sheets = payload.sheets || [];
    state.selectedSheetName = state.selectedSheetName || (state.sheets[0] && state.sheets[0].name) || "";
  }

  function normalizeItem(item) {
    return {
      itemId: item.itemId || item["工項ID"] || "",
      itemName: item.itemName || item["工作項目"] || "",
      performance: item.performance || item["執行績效及內容"] || item["履約標的及績效"] || "",
      budget: item.budget || item["核定/預估經費"] || item["經費"] || "",
      progressRatio: item.progressRatio || item["執行進度比例"] || item["工作進度"] || "",
      owner: item.owner || item["主責及協辦"] || "",
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

  function renderAll() {
    populatePeople();
    applyFilters();
    renderSheetTabs();
    renderSourceTable();
    renderRecords();
    const meta = [
      `來源更新快照：${embedded.generatedAt || "未記錄"}`,
      `${state.sheets.length} 張工作表`,
      `${state.items.length} 筆工項 / ${state.tasks.length} 筆明細`,
    ];
    $("sourceMeta").textContent = meta.join(" / ");
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
    state.items.forEach((item) => splitNames(item.owner).forEach((name) => names.add(name)));
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

  function splitNames(value) {
    return String(value || "")
      .split(/[\n、,，/]+/)
      .map((name) => name.trim().replace(/\(.+?\)/g, ""))
      .filter((name) => name && !excludedPersonLabels.has(name));
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

  function applyFilters() {
    const person = $("personFilter").value;
    const status = $("statusFilter").value;
    const query = $("searchInput").value.trim().toLowerCase();
    state.filteredItems = state.items.filter((item) => {
      const matchesPerson = !person || splitNames(item.owner).includes(person);
      const matchesStatus = !status || itemStatus(item) === status;
      const haystack = [
        item.itemName,
        item.performance,
        item.owner,
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
        item.owner ? `主責及協辦：${displayNames(item.owner) || item.owner.replace(/\n/g, "、")}` : "",
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
    $("selectedOwner").textContent = displayNames(item.owner) || item.owner || "未填";
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
    };
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

  function postNoCors(url, payload) {
    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) => data.append(key, value == null ? "" : value));
    return fetch(url, { method: "POST", mode: "no-cors", body: data });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  init();
})();
