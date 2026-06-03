(function () {
  const config = window.TAOZHUMIAO_CONFIG || {};
  const state = {
    tasks: [],
    filteredTasks: [],
    selectedTaskId: "",
    loading: false,
  };

  const demoTasks = [
    {
      taskId: "TASK0003",
      itemId: "ITEM002",
      itemName: "進用人員訓練課程-通識課程",
      taskName: "嘉義場-3/24",
      owner: "",
      dueDate: "辦理前 6 週",
      status: "已完成",
      progress: "通識課程場地及時間規劃",
      expense: "3000",
    },
    {
      taskId: "TASK0005",
      itemId: "ITEM002",
      itemName: "進用人員訓練課程-通識課程",
      taskName: "宣傳與招募",
      owner: "亭豫",
      dueDate: "辦理前 5 週",
      status: "進行中",
      progress: "製作宣傳圖文，於社群及目標群體發布資訊",
      expense: "",
    },
    {
      taskId: "TASK0015",
      itemId: "ITEM005",
      itemName: "提案說明會",
      taskName: "參與者彙整",
      owner: "",
      dueDate: "",
      status: "已完成",
      progress: "",
      expense: "",
    },
  ];

  const $ = (id) => document.getElementById(id);

  function init() {
    $("sheetLink").href = config.sheetUrl || "#";
    $("refreshButton").addEventListener("click", loadTasks);
    $("personFilter").addEventListener("change", applyFilters);
    $("statusFilter").addEventListener("change", applyFilters);
    $("searchInput").addEventListener("input", applyFilters);
    $("progressForm").addEventListener("submit", submitProgress);
    $("reporterInput").value = localStorage.getItem("taozhumiao.reporter") || "";
    $("reporterInput").addEventListener("input", (event) => {
      localStorage.setItem("taozhumiao.reporter", event.target.value.trim());
    });
    loadTasks();
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    $("refreshButton").disabled = isLoading;
    $("refreshButton").textContent = isLoading ? "讀取中" : "重新整理";
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `taozhumiao_${Date.now()}_${Math.round(Math.random() * 100000)}`;
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

  async function loadTasks() {
    setLoading(true);
    try {
      if (!config.apiUrl) {
        state.tasks = demoTasks;
        $("dataMode").textContent = "預覽";
      } else {
        const payload = await jsonp(`${config.apiUrl}?action=listTasks`);
        if (!payload || payload.ok === false) {
          throw new Error(payload && payload.error ? payload.error : "資料讀取失敗");
        }
        state.tasks = (payload.tasks || []).map(normalizeTask);
        $("dataMode").textContent = "已連線";
      }
      populatePeople();
      applyFilters();
    } catch (error) {
      state.tasks = demoTasks;
      $("dataMode").textContent = "讀取失敗";
      renderMessage(`讀取失敗，暫以預覽資料顯示：${error.message}`, "error");
      populatePeople();
      applyFilters();
    } finally {
      setLoading(false);
    }
  }

  function normalizeTask(task) {
    return {
      taskId: task.taskId || task["任務ID"] || "",
      itemId: task.itemId || task["工項ID"] || "",
      itemName: task.itemName || task["工項名稱"] || "",
      taskName: task.taskName || task["工作細項"] || "",
      owner: task.owner || task["負責同仁"] || "",
      dueDate: task.dueDate || task["預定完成日期"] || "",
      status: task.status || task["是否完成"] || "未確認",
      progress: task.progress || task["目前工作進度"] || "",
      expense: task.expense || task["費用"] || "",
    };
  }

  function populatePeople() {
    const select = $("personFilter");
    const currentValue = select.value;
    const names = new Set();
    state.tasks.forEach((task) => {
      splitNames(task.owner).forEach((name) => names.add(name));
    });
    select.innerHTML = '<option value="">全部</option>';
    [...names].sort((a, b) => a.localeCompare(b, "zh-Hant")).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = currentValue;
  }

  function splitNames(value) {
    return String(value || "")
      .split(/[\n、,，/]+/)
      .map((name) => name.trim().replace(/\(.+?\)/g, ""))
      .filter(Boolean);
  }

  function applyFilters() {
    const person = $("personFilter").value;
    const status = $("statusFilter").value;
    const query = $("searchInput").value.trim().toLowerCase();

    state.filteredTasks = state.tasks.filter((task) => {
      const matchesPerson = !person || splitNames(task.owner).includes(person);
      const matchesStatus = !status || task.status === status;
      const haystack = `${task.itemName} ${task.taskName} ${task.progress} ${task.owner}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesPerson && matchesStatus && matchesQuery;
    });

    renderSummary();
    renderTasks();
  }

  function renderSummary() {
    const total = state.tasks.length;
    const done = state.tasks.filter((task) => task.status === "已完成").length;
    $("totalTasks").textContent = total;
    $("doneTasks").textContent = done;
    $("openTasks").textContent = Math.max(total - done, 0);
    $("visibleCount").textContent = `${state.filteredTasks.length} 筆`;
  }

  function renderTasks() {
    const list = $("taskList");
    const template = $("taskTemplate");
    list.innerHTML = "";

    if (!state.filteredTasks.length) {
      const empty = document.createElement("p");
      empty.className = "task-meta";
      empty.textContent = "沒有符合條件的任務";
      list.appendChild(empty);
      return;
    }

    state.filteredTasks.forEach((task) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.taskId = task.taskId;
      node.classList.toggle("active", task.taskId === state.selectedTaskId);
      node.querySelector(".task-title").textContent = task.taskName || "未命名任務";
      node.querySelector(".task-item").textContent = task.itemName || "未指定工項";
      node.querySelector(".task-meta").textContent = [
        task.owner ? `負責：${task.owner.replace(/\n/g, "、")}` : "",
        task.dueDate ? `期限：${task.dueDate}` : "",
      ].filter(Boolean).join("  ");
      const pill = node.querySelector(".task-status");
      setStatusPill(pill, task.status);
      node.addEventListener("click", () => selectTask(task.taskId));
      list.appendChild(node);
    });
  }

  function setStatusPill(element, status) {
    const value = status || "未確認";
    element.textContent = value;
    element.classList.remove("done", "open", "unknown");
    if (value === "已完成") element.classList.add("done");
    else if (value === "未完成" || value === "進行中") element.classList.add("open");
    else element.classList.add("unknown");
  }

  function selectTask(taskId) {
    const task = state.tasks.find((item) => item.taskId === taskId);
    if (!task) return;
    state.selectedTaskId = taskId;
    $("emptyState").classList.add("hidden");
    $("progressForm").classList.remove("hidden");
    $("selectedItem").textContent = task.itemName || "未指定工項";
    $("selectedTask").textContent = task.taskName || "未命名任務";
    $("selectedOwner").textContent = task.owner || "未填";
    $("selectedDue").textContent = task.dueDate || "未填";
    $("selectedFee").textContent = task.expense ? Number(task.expense).toLocaleString("zh-TW") : "0";
    setStatusPill($("selectedStatus"), task.status);
    $("progressInput").value = task.progress || "";
    $("completeInput").value = task.status || "未確認";
    $("nextDateInput").value = "";
    $("expenseInput").value = "";
    $("expenseDetailInput").value = "";
    $("noteInput").value = "";
    renderMessage("", "");
    renderTasks();
  }

  function renderMessage(message, type) {
    const element = $("formMessage");
    element.textContent = message;
    element.className = type || "";
  }

  async function submitProgress(event) {
    event.preventDefault();
    const reporter = $("reporterInput").value.trim();
    const task = state.tasks.find((item) => item.taskId === state.selectedTaskId);

    if (!reporter) {
      renderMessage("請先填寫填報人姓名。", "error");
      $("reporterInput").focus();
      return;
    }
    if (!task) {
      renderMessage("請先選擇任務。", "error");
      return;
    }
    if (!config.apiUrl) {
      renderMessage("目前尚未設定 Apps Script API URL，頁面只能預覽，不能寫入。", "error");
      return;
    }

    const payload = {
      action: "submitProgress",
      taskId: task.taskId,
      itemId: task.itemId,
      itemName: task.itemName,
      taskName: task.taskName,
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
      task.status = payload.status;
      task.progress = payload.progress;
      if (payload.expense) task.expense = String(Number(task.expense || 0) + Number(payload.expense || 0));
      renderMessage("已送出更新。系統會重新讀取最新資料。", "success");
      await wait(900);
      await loadTasks();
      selectTask(task.taskId);
    } catch (error) {
      renderMessage(`送出失敗：${error.message}`, "error");
    } finally {
      $("submitButton").disabled = false;
    }
  }

  function postNoCors(url, payload) {
    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) => data.append(key, value == null ? "" : value));
    return fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: data,
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  init();
})();
