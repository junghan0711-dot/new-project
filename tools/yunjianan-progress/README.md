# 115 雲嘉南多元計畫進度填報網頁

這個工具設計給 GitHub Pages 靜態託管使用，前端網址會類似：

`https://junghan0711-dot.github.io/new-project/tools/yunjianan-progress/`

## 架構

- GitHub Pages：員工填報網頁
- Google Apps Script：接收填報資料，寫入 Google Sheets
- Google Sheets：即時彙整資料，必要時可下載為 Excel

## Google Sheet

目前連接的底表：

`https://docs.google.com/spreadsheets/d/1jF8XdfhtbOI22kJ0GbAU69-NuWHQLAgHLQMIhhynSF0`

## 部署 Apps Script

1. 開啟 Google Sheet。
2. 點選「擴充功能」>「Apps Script」。
3. 將 `apps-script/Code.gs` 內容貼到 Apps Script 編輯器。
4. 點選「部署」>「新增部署作業」。
5. 類型選「網頁應用程式」。
6. 執行身分選「我」。
7. 存取權限依團隊需求選「任何擁有 Google 帳戶的使用者」或「知道連結的所有人」。
8. 複製部署後的 Web App URL。
9. 將 `config.js` 的 `apiUrl` 改成該 Web App URL。
10. commit 並 push 到 GitHub，GitHub Pages 會自動更新。

## 注意

- 不要把 Google 帳號憑證、金鑰或 token 放進 repo。
- GitHub Pages 是公開靜態網站；真正的寫入權限由 Apps Script 控制。
- 若要限制填報人，建議在 Apps Script 加上 Google Workspace 網域或白名單檢查。
