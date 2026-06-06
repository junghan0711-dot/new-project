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
- 同仁工作量看板：彙整未完成工項、未完成案件、本月輔導、需追蹤數，並給工作量分數。
- 主管交辦中心：可從總控台新增交辦，寫入指定專案的 `案件追蹤列管` 與 `案件進度紀錄`。
- 提醒中心：可寄出 Email 提醒摘要給 `REMINDER_EMAILS`。

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
