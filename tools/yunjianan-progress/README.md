# 115 雲嘉南多元計畫進度填報網頁

這個工具設計給 GitHub Pages 靜態託管使用，前端網址會類似：

`https://junghan0711-dot.github.io/new-project/tools/yunjianan-progress/`

## 架構

- GitHub Pages：員工填報網頁、完整來源資料瀏覽
- Google Apps Script：接收填報資料，寫入 Google Sheets
- Google Sheets：即時彙整資料，必要時可下載為 Excel

## 來源資料

使用者指定的來源表：

`https://docs.google.com/spreadsheets/d/13Gx27AAXDy-30Dt_-GBcCIzc_Ea_5VKC/edit?gid=1521629118#gid=1521629118`

這份在 Google Drive 上是 Office Excel 檔，不是原生 Google Sheets，因此 Apps Script / Sheets API 不能直接用試算表 API 讀取。網頁的 `data.js` 已由該 Excel 產生完整快照，包含 9 張工作表、29 筆總工項、117 筆明細、進度更新與費用紀錄；員工可在網頁「任務填報」以總工項追蹤表 A 欄工作項目填報，也可在「資料總覽」檢視即時彙整表與所有來源工作表內容。

## Google Sheet

目前連接的底表：

`https://docs.google.com/spreadsheets/d/1jF8XdfhtbOI22kJ0GbAU69-NuWHQLAgHLQMIhhynSF0`

## Apps Script API

目前連接的 Web App API：

`https://script.google.com/macros/s/AKfycbzHMQY_u3n7rRIieye3qk21FvbHlPc-f3R11iVhydUB_u51HuMWZEn-qXtLdFQEuQLh/exec`

Apps Script 專案：

`https://script.google.com/d/1eNCAio-SX2IcxY1cu6Rme_-hQxqG6utZb4RJ5iz6gEKitokF1VAyg9C9/edit`

## 部署 Apps Script

1. Apps Script 程式碼放在 `apps-script/`。
2. 若用 clasp 更新，先在 `apps-script/` 目錄執行 `npx -y @google/clasp push --force`。
3. 修改程式後建立新版本並更新既有部署，避免 Web App URL 改變。
4. Web App 設定為「以我執行」與「任何人，即使是匿名使用者」可存取。
5. 若首次部署或更換帳號，請在 Apps Script 編輯器執行 `authorize_()` 完成試算表存取授權。

## 注意

- 不要把 Google 帳號憑證、金鑰或 token 放進 repo。
- GitHub Pages 是公開靜態網站；真正的寫入權限由 Apps Script 控制。
- 若要限制填報人，建議在 Apps Script 加上 Google Workspace 網域或白名單檢查。
