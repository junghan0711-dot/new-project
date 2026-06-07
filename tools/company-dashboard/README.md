# 公司專案總控台

公司內部專案總覽工具，彙整雲嘉南、桃竹苗與後續新增專案的進度、列管案件、同仁更新狀態、經費與諮詢輔導場次。

## 架構

- 前端與後端都部署在 Google Apps Script Web App。
- Apps Script 後端讀取各專案 Google Sheet。
- `ALLOWED_EMAILS` 控制誰可以登入總控台。
- 各專案仍保留獨立 GitHub Pages 網頁，總控台只提供主管摘要與快速連結。

## 第一版資料來源

- 115 雲嘉南多元計畫
- 115 桃竹苗多元計畫

## 已啟用功能

- 待辦優先序：今天必追、本週需追、逾期、一般提醒。
- 週報 / 月報產生器：依目前總控台資料產出可複製的會議、週報或月報摘要，包含整體狀態、各專案摘要、待查核、同仁回報、資料品質與建議下一步。
- 主管待查核清單：集中顯示待查核、逾期、今日到期、急件未結、超過 7 天未回報與最近完成待確認的案件，並可複製目前篩選後的清單作為會議或提醒摘要。
- 查核篩選：可依專案、同仁、狀態、優先序篩選待查核案件，並直接開啟專案頁或 Google Sheet 底表。
- 主管查核動作：可在總控台直接查核通過、退回補件、加註主管意見或延長 Deadline，並同步寫回對應專案的 `案件追蹤列管` 與 `案件進度紀錄`。
- 同仁回報提醒：彙整每位同仁近 7 日更新、需追蹤工項、未完成案件、逾期、待查核與今日/3 日內到期案件，標示「今天要追」「本週追蹤」「有更新」，並可快速篩選提醒等級、一鍵跳到該同仁待查核案件、複製個人提醒文字或批次複製目前篩選名單。
- 同仁工作量看板：彙整未完成工項、未完成案件、本月輔導、需追蹤數，並給工作量分數。
- 主管交辦中心：可從總控台新增交辦，寫入指定專案的 `案件追蹤列管` 與 `案件進度紀錄`。
- 主管交辦中心：指定同事欄位會帶出目前各專案已出現過的同仁名單。
- 提醒中心：可預覽、複製並寄出 Email 提醒摘要給 `REMINDER_EMAILS`。
- 資料容錯：單一專案 Google Sheet 暫時讀取失敗時，會顯示紅燈錯誤卡，不會讓整個總控台無法載入。

## LINE 提醒

`Code.gs` 內預留 `LINE_WEBHOOK_URL`。取得正式 LINE webhook 後填入即可啟用；未設定時只寄 Email。

## 權限

總控台不可部署為 `ANYONE_ANONYMOUS`。建議部署設定：

- Execute as: `USER_ACCESSING`
- Access: `ANYONE`

並在 `Code.gs` 的 `ALLOWED_EMAILS` 放入 Hank 的 Google 帳號。

目前初始白名單：

- `junghan0711@gmail.com`

## Apps Script

- Script project: `https://script.google.com/d/1H25gQRkKRNxZSAAhZol2Nhlm1lukOnbT5P44rfX-D_rpN7G1q1oMZajU/edit`
- Web App: `https://script.google.com/macros/s/AKfycbyknQkwIo9PXksPGtCCCDkO8C-d2Vje4ZkBgWGU2gNo_dQU5o7hTlYtja1kVoXzfbLP/exec`

第一次開啟時需由白名單內的 Google 帳號完成 Apps Script 權限授權。

## 固定網址部署

總控台建議用既有 deployment ID 更新，讓使用者永遠開同一個 Web App 網址：

```bash
tools/scripts/deploy-apps-script.sh tools/company-dashboard \
  --deployment-id AKfycbyknQkwIo9PXksPGtCCCDkO8C-d2Vje4ZkBgWGU2gNo_dQU5o7hTlYtja1kVoXzfbLP \
  --description "Improve dashboard usability"
```

若未帶 `--deployment-id`，Apps Script 會建立新的部署網址，需另外通知使用者改開新網址。
