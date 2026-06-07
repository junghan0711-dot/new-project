# 新專案快速生成模板 SOP

用途：把新的政府計畫或公司專案快速建立成獨立進度填報網頁，並視需要接進公司專案總控台。

## 適用情境

- 已有 Excel 工項追蹤表，要轉成網頁。
- 已有 Google Sheet，要讓同仁透過網頁更新進度、案件、諮詢輔導或解除列管。
- 新專案要納入公司專案總控台，讓主管可以看紅黃綠燈、待查核、同仁回報提醒。

## 準備資料

1. 專案名稱：例 `115 某某多元計畫`
2. 工具資料夾名稱：例 `example-progress`
3. 辦公室或區域：例 `北部`、`桃竹苗`、`雲嘉南`
4. 原始 Excel 路徑
5. Google Sheet 網址
6. 是否接進公司總控台

## 產生流程

1. 複製設定檔範本：

```bash
cp tools/scripts/project-template.example.json /tmp/new-project.json
```

2. 編輯 `/tmp/new-project.json`。

3. 乾跑確認：

```bash
tools/scripts/create-project-from-template.py --config /tmp/new-project.json --dry-run
```

4. 正式產生：

```bash
tools/scripts/create-project-from-template.py --config /tmp/new-project.json
```

5. 上線前檢查：

```bash
tools/scripts/check-progress-tracker.py tools/example-progress
```

6. 部署專案 Apps Script：

```bash
tools/scripts/deploy-apps-script.sh tools/example-progress \
  --title "115 某某計畫進度填報 API" \
  --update-config
```

7. 若有接進公司總控台，部署總控台：

```bash
tools/scripts/deploy-apps-script.sh tools/company-dashboard \
  --deployment-id AKfycbyknQkwIo9PXksPGtCCCDkO8C-d2Vje4ZkBgWGU2gNo_dQU5o7hTlYtja1kVoXzfbLP \
  --description "Add new project"
```

8. commit 並 push，讓 GitHub Pages 更新。

## 驗收項目

- 專案頁可開啟。
- `config.js` 有 Google Sheet URL 與 Apps Script API URL。
- `data.js` 有工項、任務與原始工作表快照。
- 新增列管案件可以寫入 Google Sheet。
- 補最新進度可以立即讀回。
- 解除列管後會出現在已完成列管區塊。
- 若接進總控台，主管待查核與同仁回報提醒能看到該專案資料。

## 注意

- `config.js` 會包含公開的 Apps Script Web App URL，不要放任何 token 或密鑰。
- Apps Script 權限設定要依專案用途決定；同仁填報頁通常可用 `ANYONE`，公司總控台維持主管白名單。
- 若來源是桃竹苗多元就業開發方案，仍需先從 Google Drive 搜尋確認正式資料來源。
