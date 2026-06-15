# Progress Tracker Build Scripts

這個資料夾放「政府計畫進度填報網頁」的重複建置工具，讓下次新增類似桃竹苗、雲嘉南的內部管理網頁時少走手動流程。

## 0. 專案註冊表

所有已上線或準備維護的工具，先集中登錄在：

```bash
tools/project-registry.json
```

目前註冊表會記錄：

- `id`、`name`、`office`：專案識別、顯示名稱與辦公室/區域
- `type`：工具類型，例如 `progress-tracker` 或 `apps-script-dashboard`
- `toolDir`：本機工具資料夾
- `pageUrl`：前端或總控台網址
- `sheetId` / `sheetUrl`：專案底表
- `appsScript.scriptId`、`deploymentId`、`webAppUrl`：Apps Script 專案與固定部署
- `features`：是否啟用案件追蹤、諮詢輔導、修改歷程等功能

新增專案時，先建立工具資料夾，再把專案加入這份註冊表。後續巡檢、部署與總控台整合都應優先讀這份檔案，避免把專案資訊散落在多個腳本。

## 1. 用新專案模板快速建立

先複製範本：

```bash
cp tools/scripts/project-template.example.json /tmp/my-project.json
```

修改 `/tmp/my-project.json` 的欄位：

- `toolName`：工具資料夾名稱，例如 `taichung-progress`
- `projectName`：畫面顯示的專案名稱
- `office`：總控台顯示的辦公室或區域
- `spreadsheetUrl`：Google Sheet 網址或試算表 ID
- `xlsx`：原始 Excel 檔路徑
- `template`：要複製的既有網頁模板，預設用桃竹苗
- `addToDashboard`：是否自動接進公司專案總控台

乾跑確認：

```bash
tools/scripts/create-project-from-template.py --config /tmp/my-project.json --dry-run
```

正式產生：

```bash
tools/scripts/create-project-from-template.py --config /tmp/my-project.json
```

產生後會建立 `tools/<toolName>/SETUP_CHECKLIST.md`，照清單部署 Apps Script、檢查、commit/push。

## 2. 直接建立新進度網頁

```bash
tools/scripts/create-progress-tracker.py \
  --xlsx "/path/to/source.xlsx" \
  --tool-name "example-progress" \
  --project-name "115 某某計畫" \
  --source-url "https://docs.google.com/spreadsheets/d/..." \
  --sheet-url "" \
  --api-url ""
```

輸出位置會是 `tools/<tool-name>/`。預設會用 `tools/taozhumiao-progress/` 當模板，並自動產生：

- `index.html`
- `app.js`
- `styles.css`
- `config.js`
- `data.js`
- `apps-script/Code.gs`
- `apps-script/appsscript.json`

## 3. 部署 Apps Script

已登錄到 `tools/project-registry.json` 的工具，優先用專案 id 部署：

```bash
tools/scripts/deploy-registered-tool.sh yunjianan \
  --description "Update case tracking"
```

這會自動讀取對應的 `toolDir` 與 `appsScript.deploymentId`，並更新既有部署網址。
若新專案尚未有 `appsScript.deploymentId`，腳本會建立新的 Apps Script 部署；部署完成後請把輸出的 deployment id / Web App URL 回填到 `tools/project-registry.json`，並把專案 `status` 從 `setup` 改為 `active`。

若是尚未登錄的新工具，才直接指定工具資料夾：

```bash
tools/scripts/deploy-apps-script.sh tools/example-progress \
  --title "115 某某計畫進度填報 API" \
  --description "Initial web app deployment" \
  --access ANYONE \
  --update-config
```

注意：

- `ANYONE` 代表任何 Google 帳戶可用。
- `ANYONE_ANONYMOUS` 代表理論上的匿名公開，但實際是否可用會受 Google 帳號與組織政策影響。
- 若沒有 `.clasp.json`，腳本會建立 standalone Apps Script 專案，並避免 `clasp create` 洗掉 manifest。

## 4. 上線前檢查

```bash
tools/scripts/check-progress-tracker.py tools/example-progress \
  --url "https://junghan0711-dot.github.io/new-project/tools/example-progress/"
```

檢查內容包含：

- 必要檔案是否存在
- `app.js`、`data.js`、`Code.gs` 語法
- `data.js` 是否可解析
- `config.js` 是否有 Google Sheet / Apps Script URL
- `app.js` 參照的 DOM id 是否都存在於 `index.html`
- Apps Script manifest 權限與 scopes
- GitHub Pages URL 是否回 200

若要一次檢查目前主要線上工具：

```bash
tools/scripts/check-all-web-tools.sh
```

這會讀取 `tools/project-registry.json`，檢查所有 `status: active` 的工具。`progress-tracker` 會檢查 GitHub Pages / Apps Script API health / README 與 config URL 一致性；`apps-script-dashboard` 會做 Apps Script 語法與 manifest 檢查。
