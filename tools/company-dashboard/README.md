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

## 權限

總控台不可部署為 `ANYONE_ANONYMOUS`。建議部署設定：

- Execute as: `USER_ACCESSING`
- Access: `ANYONE`

並在 `Code.gs` 的 `ALLOWED_EMAILS` 放入 Hank 的 Google 帳號。

目前初始白名單：

- `junghan0711@gmail.com`

## Apps Script

- Script project: `https://script.google.com/d/1H25gQRkKRNxZSAAhZol2Nhlm1lukOnbT5P44rfX-D_rpN7G1q1oMZajU/edit`
- Web App: `https://script.google.com/macros/s/AKfycbx3SuS6UU4uQiZXRv6MCKFhU_y52fBh9C0UYq6NElHYa4iAlMzITdeAXBIyauOeQmye/exec`

第一次開啟時需由白名單內的 Google 帳號完成 Apps Script 權限授權。
