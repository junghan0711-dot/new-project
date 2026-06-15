# 115 桃竹苗多元計畫進度填報網頁

這個工具設計給 GitHub Pages 靜態託管使用，前端網址會類似：

`https://junghan0711-dot.github.io/new-project/tools/taozhumiao-progress/`

## 架構

- GitHub Pages：員工填報網頁、完整來源資料瀏覽、管理摘要
- Google Apps Script：接收填報資料，寫入 Google Sheets
- Google Sheets：即時彙整資料，必要時可下載為 Excel
- 案件追蹤列管：新增案件、案件編號、指定同事、查核點、Deadline、最新進度、完成/解除列管
- 我的工作：同仁輸入或選擇姓名後，可集中查看自己負責的工項、未完成追蹤案件與諮詢輔導場次，並直接跳到對應回報區。
- 我的追蹤案件：同仁在案件追蹤列管頁籤最上方輸入或選擇姓名，即可先看到自己負責的未完成追蹤案件，並可一鍵帶入回報表單。
- 管理摘要：彙整逾期、急件、待查核、近 7 日更新、經費支出與資料品質提醒，可直接複製成週會或月報文字

## 來源資料

使用者指定的來源表：

`/Users/junghanchiu/Downloads/115年桃竹苗多元計畫工項追蹤及列管1150603更新.xlsx`

Google Drive 對應檔案：

原使用者指定 Excel 檔：

`https://docs.google.com/spreadsheets/d/1ri9xT_MKK6OxbjixNOJMJznzKljbeLU0/edit?gid=786390987#gid=786390987`

已轉換為原生 Google Sheet，供網頁即時更新使用：

`https://docs.google.com/spreadsheets/d/1_vblpEZtfs7oj7yH2EXzOUMZYI_8OmG9hdc4ASQd3e8`

`data.js` 已由該 Excel 產生快照，包含 19 筆總工項、44 筆任務明細與 14 張原始工作表。

## Google Sheet

目前連接的底表：

`https://docs.google.com/spreadsheets/d/1_vblpEZtfs7oj7yH2EXzOUMZYI_8OmG9hdc4ASQd3e8`

## Apps Script API

目前 `config.js` 的 `apiUrl` 已設定為桃竹苗 Apps Script Web App，前端會優先讀取線上 Google Sheet；若線上 API 讀取失敗，會退回 `data.js` 快照預覽。

Web App URL：

`https://script.google.com/macros/s/AKfycbwbPhlynzzmp2_bvEeRCG4OOokn1OsgYqrD-C-TvvVwpGATutVJHW-sv7BiZ8dRoM_tTA/exec`

Apps Script 會使用以下工作表：

- `工項主檔`
- `任務明細`
- `進度更新紀錄`
- `經費支出紀錄`
- `案件追蹤列管`
- `案件進度紀錄`
- `諮詢輔導場次`
- `修改歷程`

## 部署 Apps Script

1. Apps Script 程式碼放在 `apps-script/`。
2. 若用 clasp 更新，需先建立或綁定桃竹苗 Apps Script 專案，再補 `.clasp.json` 的 `scriptId`。
3. 修改程式後建立新版本並更新既有部署，避免 Web App URL 改變。
4. Web App 建議設定為「以我執行」與「任何 Google 帳戶」或「任何人，即使是匿名使用者」可存取。
5. 若首次部署或更換帳號，請在 Apps Script 編輯器執行 `authorize` 完成試算表存取授權。

## 注意

- 不要把 Google 帳號憑證、金鑰或 token 放進 repo。
- GitHub Pages 是公開靜態網站；真正的寫入權限由 Apps Script 控制。
- 本版 Apps Script 已提供 `ALLOWED_REPORTERS` 選用白名單；維持空陣列代表不限制，填入姓名後只有名單內填報人可寫入。
- 新增案件會自動產生 `CASE-0001` 這類案件編號；指定同事可用案件編號補最新進度，狀態改為 `已完成` 並填寫完成/解除列管說明後即可解除列管。
- 案件卡片會顯示最近 3 筆 `案件進度紀錄`，同事送出最新進度後，可直接回到案件列表查看最新回報內容。
- 編輯既有工項回報、追蹤案件、案件進度或諮詢輔導場次時，Apps Script 會自動建立 `修改歷程` 工作表，記錄資料表、記錄ID、欄位、原值、新值、修改人與修改時間；原本送出的日期/建立時間不會被覆蓋。
