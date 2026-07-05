# 中部青創基地營運總控台

這個工具是給主管看整體狀態的 Drive 彙整儀表板。同仁仍維持原本在 Google Drive 資料夾、表單、試算表與文件內更新資料；網頁負責彙整出缺漏、延遲、待確認與方向提醒。

## 工具位置

前端：

`tools/taichung-youth-base/`

預計 GitHub Pages：

`https://junghan0711-dot.github.io/new-project/tools/taichung-youth-base/`

## 目前第一版內容

- 總覽：整體風險、近期 Drive 動態、本週空間回報、工項狀態。
- Drive 更新：列出核心來源、更新時間與敏感資料提醒。
- 月報佐證：依 `成果報告資料整理` 01-23 類建立檢核視圖。
- 工項進度：依 `勞工局新創基地_工作執行進度表.xlsx` 摘要工項。
- 空間營運：依 `青創基地每週空間回報` 顯示審計/光復進駐與空缺。
- 修繕經費：依 `摘星計畫區房舍修繕費用統計表.xlsx` 顯示已用與剩餘。
- 案件列管：先放合約、月報格式、空間申請、競爭型補助、座談反映事項等管理提醒。
- 主管摘要：可一鍵複製成週會或月報用文字。

## 主要 Drive 來源

- 根目錄：`https://drive.google.com/drive/folders/0AN_42cvSSGfMUk9PVA`
- 每週空間回報：`https://docs.google.com/spreadsheets/d/1k7hU4dBymaM31XNDWD5fbiHOlHlF3Xjfxh0ooAgvTaA`
- 工項進度表：`https://docs.google.com/spreadsheets/d/1te31KWIfonRdR-zBQcC-ejfIr5hYWeli`
- 修繕費用表：`https://docs.google.com/spreadsheets/d/1pEacGjwdO_esmTOr2MuALYuUOEz7MHFE`
- 成果報告資料整理：`https://drive.google.com/drive/folders/114qmRGC4XnNNkQF0dnKhTL4hgWTsh7L9`

## 隱私與資料邊界

中部 Drive 內含進駐青年姓名、電話、Email、地址、統編、租約、身分證、存摺等敏感資料。第一版前端快照只放非敏感的管理摘要，不放完整台帳。

若之後要讀完整資料，建議：

- 由 Apps Script 以白名單帳號執行資料彙整。
- API 只回傳主管需要看的摘要欄位。
- GitHub Pages 不內嵌個資與附件快照。
- 個資、租約、身分證、存摺等只留在 Google Drive 權限內。

## 後端部署方式

`apps-script/Code.gs` 是索引器草稿，預計部署為 Web App 後填入 `config.js`：

```js
window.TAICHUNG_YOUTH_BASE_CONFIG = {
  apiUrl: "https://script.google.com/macros/s/<deployment-id>/exec",
  driveRootUrl: "https://drive.google.com/drive/folders/0AN_42cvSSGfMUk9PVA",
};
```

目前尚未部署 Apps Script，也尚未建立正式中控 Google Sheet。
