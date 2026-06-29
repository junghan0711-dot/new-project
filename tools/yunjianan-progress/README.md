# 115 雲嘉南多元計畫進度填報網頁

這個工具設計給 GitHub Pages 靜態託管使用，前端網址會類似：

`https://junghan0711-dot.github.io/new-project/tools/yunjianan-progress/`

## 架構

- GitHub Pages：員工填報網頁、完整來源資料瀏覽
- Google Apps Script：接收填報資料，寫入 Google Sheets
- Google Sheets：即時彙整資料，必要時可下載為 Excel
- 案件追蹤列管：臨時交辦事項、指定同事、查核點、Deadline 與進度回報寫入 `案件追蹤列管` 工作表
- 管理摘要：彙整逾期、急件、待查核、近 7 日更新、經費支出與資料品質提醒，可直接複製成週會或月報文字
- 我的工作：同仁輸入或選擇姓名後，可集中查看自己負責的工項、未完成追蹤案件與諮詢輔導場次，並直接跳到對應回報區。
- 工作行事曆：同仁可新增個人工作提醒，頁面會同步彙整工項下次追蹤、案件 Deadline、任務預定完成日與諮詢輔導場次，主管可用月份、同仁與提醒類型篩選全員工作時間點。
- 我的追蹤案件：同仁在案件追蹤列管頁籤最上方輸入或選擇姓名，即可先看到自己負責的未完成追蹤案件，並可一鍵帶入回報表單。
- 案件編號與解除列管：新增案件會自動產生 `CASE-0001` 這類案件編號；指定同事可用案件編號補最新進度，狀態改為 `已完成` 並填寫完成/解除列管說明後即可解除列管；每次回報會另存到 `案件進度紀錄`
- 案件卡片會顯示最近 3 筆 `案件進度紀錄`，同事送出最新進度後，可直接回到案件列表查看最新回報內容。
- 同仁通訊錄：雲嘉南專辦與分署窗口資料放在 Google Sheet 的 `同仁通訊錄` 工作表；公開專案頁不顯示通訊錄，只有公司專案總控台通過 Google 帳號驗證後可查看。新增列管案件指定同事時，Apps Script 仍會用這張表查找 Email 與 LINE 通知設定。

## 來源資料

使用者指定的來源表：

`https://docs.google.com/spreadsheets/d/13Gx27AAXDy-30Dt_-GBcCIzc_Ea_5VKC/edit?gid=1521629118#gid=1521629118`

這份在 Google Drive 上是 Office Excel 檔，不是原生 Google Sheets，因此 Apps Script / Sheets API 不能直接用試算表 API 讀取。網頁的 `data.js` 已由該 Excel 產生完整快照，包含 9 張工作表、29 筆總工項、117 筆明細、進度更新與費用紀錄；員工可在網頁「任務填報」以總工項追蹤表 A 欄工作項目填報，也可在「資料總覽」檢視即時彙整表與所有來源工作表內容。

## Google Sheet

目前連接的底表：

`https://docs.google.com/spreadsheets/d/1jF8XdfhtbOI22kJ0GbAU69-NuWHQLAgHLQMIhhynSF0`

## Apps Script API

目前連接的 Web App API：

`https://script.google.com/macros/s/AKfycbwNcNlUHsQbkUFD39Wssd_a81OtEXQ2l8QtVXE4GBNY5JDLM7I2FcTgRRGkXLsOXvC8/exec`

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
- 本版 Apps Script 已提供 `ALLOWED_REPORTERS` 選用白名單；維持空陣列代表不限制，填入姓名後只有名單內填報人可寫入。
- 表單新增「佐證資料連結」，會寫入 `進度更新紀錄` 的 `佐證資料連結`、`經費支出紀錄` 的 `憑證連結`，以及 `案件追蹤列管` 的 `佐證資料連結`。若既有工作表缺少欄位，Apps Script 會在送出時補上表頭。
- `案件追蹤列管` 若缺少 `完成/解除列管說明`、`解除列管時間` 欄位，Apps Script 會自動補上；`案件進度紀錄` 不存在時也會自動建立。
- `工作行事曆` 不存在時，Apps Script 會自動建立，欄位包含提醒標題、負責同仁、日期、時間、提醒類型、狀態、關聯工項/案件、提醒內容與佐證資料連結。
- 編輯既有工項回報、追蹤案件、案件進度或諮詢輔導場次時，Apps Script 會自動建立 `修改歷程` 工作表，記錄資料表、記錄ID、欄位、原值、新值、修改人與修改時間；原本送出的日期/建立時間不會被覆蓋。
- 新增列管案件時，Apps Script 會依 `同仁通訊錄` 的姓名寄出 Email 通知。若同仁有多個信箱，可用換行、逗號或分號分隔。
- LINE 直接私訊不能只靠一般 LINE ID；若要啟用 LINE，請在 Apps Script 專案屬性設定 `LINE_WEBHOOK_URL` 做群組/外部 webhook 通知，或設定 `LINE_CHANNEL_ACCESS_TOKEN` 並在通訊錄補 `LINE User ID` 才能用 Messaging API 推播。
- Apps Script 新增寄信與外部請求 scope 後，若送出案件時出現授權錯誤，請在 Apps Script 編輯器執行一次 `authorize_()` 或任一通知相關函式完成授權。
