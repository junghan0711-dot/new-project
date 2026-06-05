# Progress Tracker Build Scripts

這個資料夾放「政府計畫進度填報網頁」的重複建置工具，讓下次新增類似桃竹苗、雲嘉南的內部管理網頁時少走手動流程。

## 1. 建立新進度網頁

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

## 2. 部署 Apps Script

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
