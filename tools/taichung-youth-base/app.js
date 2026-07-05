(function () {
  const config = window.TAICHUNG_YOUTH_BASE_CONFIG || {};
  const embedded = window.TAICHUNG_YOUTH_BASE_DATA || {};
  const state = {
    data: embedded,
    mode: "快照",
  };

  const $ = (id) => document.getElementById(id);
  const statusLabels = {
    ok: "正常",
    watch: "注意",
    risk: "風險",
  };

  function init() {
    $("driveLink").href = config.driveRootUrl || embedded.driveRootUrl || "#";
    $("refreshButton").addEventListener("click", loadData);
    $("copySummaryButton").addEventListener("click", copySummary);
    $("driveStatusFilter").addEventListener("change", renderDriveSources);
    $("categoryFilter").addEventListener("change", renderWorkItems);
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });
    loadData();
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `taichung_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
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
        reject(new Error("無法讀取 Apps Script API"));
      };
      script.src = `${url}${separator}callback=${callbackName}`;
      document.body.appendChild(script);
    });
  }

  async function loadData() {
    $("refreshButton").disabled = true;
    $("refreshButton").textContent = "讀取中";
    try {
      if (config.apiUrl) {
        const payload = await jsonp(`${config.apiUrl}?action=listData`);
        if (!payload || payload.ok === false) {
          throw new Error((payload && payload.error) || "API 回傳失敗");
        }
        state.data = mergeData(embedded, payload);
        state.mode = "已連線";
      } else {
        state.data = embedded;
        state.mode = "快照";
      }
    } catch (error) {
      state.data = embedded;
      state.mode = "快照備援";
      showToast(`線上資料讀取失敗，改用快照：${error.message}`);
    } finally {
      renderAll();
      $("refreshButton").disabled = false;
      $("refreshButton").textContent = "重新整理";
    }
  }

  function mergeData(base, remote) {
    return {
      ...base,
      ...remote,
      sources: remote.sources && remote.sources.length ? remote.sources : base.sources,
      workItems: remote.workItems && remote.workItems.length ? remote.workItems : base.workItems,
      evidenceCategories: remote.evidenceCategories && remote.evidenceCategories.length ? remote.evidenceCategories : base.evidenceCategories,
      spaceReport: remote.spaceReport || base.spaceReport,
      repairBudget: remote.repairBudget || base.repairBudget,
      cases: remote.cases && remote.cases.length ? remote.cases : base.cases,
    };
  }

  function renderAll() {
    $("dataMode").textContent = state.mode;
    renderTopMetrics();
    renderAlerts();
    renderRecentDrive();
    renderSpaceSnapshot();
    renderWorkStatus();
    renderDriveSources();
    renderEvidence();
    renderCategoryFilter();
    renderWorkItems();
    renderSpaceDetail();
    renderRepairs();
    renderCases();
    renderManagerSummary();
  }

  function switchView(viewId) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active", view.id === viewId);
    });
  }

  function renderTopMetrics() {
    const data = state.data;
    const risks = collectAlerts().filter((item) => item.status === "risk").length;
    const watches = collectAlerts().filter((item) => item.status === "watch").length;
    const evidence = data.evidenceCategories || [];
    const evidenceOk = evidence.filter((item) => item.status === "ok").length;
    $("overallStatus").textContent = risks ? `${risks} 風險` : watches ? `${watches} 注意` : "正常";
    $("evidenceStatus").textContent = `${evidenceOk}/${evidence.length}`;
    $("repairBalance").textContent = formatMoney((data.repairBudget || {}).balance || 0);
  }

  function collectAlerts() {
    const data = state.data;
    const sourceAlerts = (data.sources || [])
      .filter((source) => source.status !== "ok")
      .map((source) => ({
        status: source.status,
        title: source.name,
        text: source.note,
      }));
    const workAlerts = (data.workItems || [])
      .filter((item) => item.status === "risk")
      .map((item) => ({
        status: item.status,
        title: item.name,
        text: item.note,
      }));
    const caseAlerts = (data.cases || [])
      .filter((item) => item.status === "risk")
      .map((item) => ({
        status: item.status,
        title: item.title,
        text: item.note,
      }));
    return [...caseAlerts, ...workAlerts, ...sourceAlerts].slice(0, 12);
  }

  function renderAlerts() {
    const alerts = collectAlerts();
    $("alertCount").textContent = `${alerts.length} 項`;
    $("alertList").innerHTML = alerts.length
      ? alerts.map((item) => `
          <article class="alert-item">
            <span class="status-dot ${escapeHtml(item.status)}"></span>
            <div>
              <div class="item-title">
                <h3>${escapeHtml(item.title)}</h3>
                ${pill(item.status)}
              </div>
              <p class="subtle">${escapeHtml(item.text || "")}</p>
            </div>
          </article>
        `).join("")
      : `<p class="subtle">目前沒有明顯風險。</p>`;
  }

  function renderRecentDrive() {
    const sources = [...(state.data.sources || [])].sort((a, b) => new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0));
    $("latestDriveDate").textContent = sources[0] ? formatDate(sources[0].modifiedTime) : "-";
    $("recentDriveList").innerHTML = sources.slice(0, 5).map((source) => `
      <article class="source-item">
        <div>
          <div class="item-title">
            <a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.name)}</a>
          </div>
          <p>${escapeHtml(source.type || "")}｜更新：${escapeHtml(formatDate(source.modifiedTime))}</p>
        </div>
        ${pill(source.status)}
      </article>
    `).join("");
  }

  function renderSpaceSnapshot() {
    const report = state.data.spaceReport || {};
    const total = report.total || {};
    $("spaceWeek").textContent = `最新：${report.week || "-"}`;
    $("spaceSnapshot").innerHTML = [
      ["進駐店家", total.occupied || 0],
      ["空缺空間", total.vacant || 0],
      ["下次回報", report.nextDue || "-"],
      ["參訪", total.visits || "-"],
    ].map(([label, value]) => `
      <div class="stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </div>
    `).join("");
  }

  function renderWorkStatus() {
    const items = state.data.workItems || [];
    $("workStatusCount").textContent = `${items.length} 項`;
    $("workStatusList").innerHTML = items
      .filter((item) => item.status !== "ok")
      .slice(0, 6)
      .map((item) => `
        <article class="table-row">
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.category)}｜${escapeHtml(item.schedule)}</p>
          </div>
          <p>${escapeHtml(item.note)}</p>
          <div>${progressBar(item.progress)}</div>
          <div>${pill(item.status)}</div>
        </article>
      `).join("");
  }

  function renderDriveSources() {
    const filter = $("driveStatusFilter").value;
    const sources = (state.data.sources || []).filter((source) => !filter || source.status === filter);
    $("driveSourceList").innerHTML = sources.map((source) => `
      <article class="source-item">
        <div>
          <div class="item-title">
            <a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.name)}</a>
            ${pill(source.status)}
          </div>
          <p>${escapeHtml(source.type)}｜更新：${escapeHtml(formatDate(source.modifiedTime))}</p>
          <p>${escapeHtml(source.note || "")}</p>
        </div>
      </article>
    `).join("");
  }

  function renderEvidence() {
    const evidence = state.data.evidenceCategories || [];
    $("evidenceMonth").textContent = state.data.evidenceMonth || "本月";
    $("evidenceList").innerHTML = evidence.map((item) => `
      <article class="evidence-item">
        <div class="item-title">
          <h3>${escapeHtml(item.name)}</h3>
          ${pill(item.status)}
        </div>
        <p>${escapeHtml(item.note || "")}</p>
      </article>
    `).join("");
  }

  function renderCategoryFilter() {
    const select = $("categoryFilter");
    const current = select.value;
    const categories = [...new Set((state.data.workItems || []).map((item) => item.category).filter(Boolean))].sort();
    select.innerHTML = `<option value="">全部</option>${categories.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`).join("")}`;
    select.value = categories.includes(current) ? current : "";
  }

  function renderWorkItems() {
    const filter = $("categoryFilter").value;
    const items = (state.data.workItems || []).filter((item) => !filter || item.category === filter);
    $("workItemList").innerHTML = items.map((item) => `
      <article class="table-row">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.category)}｜主責：${escapeHtml(item.owner || "待填")}</p>
        </div>
        <p>${escapeHtml(item.note || "")}</p>
        <div>
          <p>${escapeHtml(item.schedule || "")}</p>
          ${progressBar(item.progress)}
        </div>
        <div>${pill(item.status)}</div>
      </article>
    `).join("");
  }

  function renderSpaceDetail() {
    const report = state.data.spaceReport || {};
    $("spaceDetail").innerHTML = [
      ["光復新村", report.guangfu || {}],
      ["審計新村", report.shenji || {}],
    ].map(([name, item]) => `
      <article class="space-card">
        <div class="item-title">
          <h3>${escapeHtml(name)}</h3>
          <span class="pill">最新 ${escapeHtml(report.week || "-")}</span>
        </div>
        <div class="stat-grid">
          <div class="stat"><span>可進駐</span><strong>${escapeHtml(String(item.available || 0))}</strong></div>
          <div class="stat"><span>現進駐</span><strong>${escapeHtml(String(item.occupied || 0))}</strong></div>
          <div class="stat"><span>未進駐</span><strong>${escapeHtml(String(item.vacant || 0))}</strong></div>
          <div class="stat"><span>空間</span><strong>${escapeHtml(item.vacantUnits || "-")}</strong></div>
        </div>
      </article>
    `).join("");
  }

  function renderRepairs() {
    const budget = state.data.repairBudget || {};
    const ratio = budget.total ? Math.round((budget.spent / budget.total) * 100) : 0;
    $("repairUpdated").textContent = `更新：${budget.updated || "-"}`;
    $("repairSummary").innerHTML = `
      <div class="item-title">
        <h3>已用 ${formatMoney(budget.spent || 0)} / 總經費 ${formatMoney(budget.total || 0)}</h3>
        <span class="pill ${ratio > 80 ? "risk" : ratio > 60 ? "watch" : "ok"}">剩餘 ${formatMoney(budget.balance || 0)}</span>
      </div>
      <div class="budget-track"><div class="budget-fill" style="width: ${Math.min(ratio, 100)}%"></div></div>
    `;
    $("repairList").innerHTML = (budget.items || []).map((item) => `
      <article class="table-row">
        <div>
          <h3>${escapeHtml(item.item)}</h3>
          <p>${escapeHtml(item.date)}｜${escapeHtml(item.base)}</p>
        </div>
        <p>近期修繕支出</p>
        <strong>${formatMoney(item.amount || 0)}</strong>
        <div>${pill("ok")}</div>
      </article>
    `).join("");
  }

  function renderCases() {
    const cases = state.data.cases || [];
    $("caseCount").textContent = `${cases.length} 件`;
    $("caseList").innerHTML = cases.map((item) => `
      <article class="case-item">
        <div class="item-title">
          <h3>${escapeHtml(item.title)}</h3>
          ${pill(item.status)}
        </div>
        <p>${escapeHtml(item.type)}｜期限：${escapeHtml(item.due || "待確認")}</p>
        <p>${escapeHtml(item.note || "")}</p>
      </article>
    `).join("");
  }

  function renderManagerSummary() {
    const data = state.data;
    const alerts = collectAlerts();
    const evidence = data.evidenceCategories || [];
    const missingEvidence = evidence.filter((item) => item.status !== "ok").slice(0, 8);
    const budget = data.repairBudget || {};
    const report = data.spaceReport || {};
    const lines = [
      `中部青創基地營運摘要（${formatDateTime(new Date())}）`,
      "",
      `整體狀態：${$("overallStatus").textContent}`,
      `空間回報：最新 ${report.week || "-"}，進駐 ${((report.total || {}).occupied || 0)}，空缺 ${((report.total || {}).vacant || 0)}，下次回報 ${report.nextDue || "-"}`,
      `修繕經費：總經費 ${formatMoney(budget.total || 0)}，已用 ${formatMoney(budget.spent || 0)}，剩餘 ${formatMoney(budget.balance || 0)}`,
      `月報佐證：${evidence.filter((item) => item.status === "ok").length}/${evidence.length} 類目前標示正常`,
      "",
      "優先追蹤：",
      ...alerts.slice(0, 6).map((item, index) => `${index + 1}. [${statusLabels[item.status] || item.status}] ${item.title}：${item.text}`),
      "",
      "本月佐證待確認：",
      ...missingEvidence.map((item, index) => `${index + 1}. ${item.name}`),
    ];
    $("summaryGeneratedAt").textContent = formatDateTime(new Date());
    $("managerSummary").value = lines.join("\n");
  }

  async function copySummary() {
    const text = $("managerSummary").value || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("已複製主管摘要");
    } catch (error) {
      $("managerSummary").focus();
      $("managerSummary").select();
      showToast("已選取摘要，可手動複製");
    }
  }

  function pill(status) {
    const safeStatus = status || "watch";
    return `<span class="pill ${escapeAttr(safeStatus)}">${escapeHtml(statusLabels[safeStatus] || safeStatus)}</span>`;
  }

  function progressBar(value) {
    const width = Math.max(0, Math.min(Number(value) || 0, 100));
    return `<div class="progress-bar" title="${width}%"><div class="progress-fill" style="width: ${width}%"></div></div>`;
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function formatDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  init();
})();
