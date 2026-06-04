# 網頁工具建置 SOP

建立日期：2026-06-04

用途：之後要把政府計畫、公司接案、內部管理或專案追蹤需求做成網頁工具時，可依這份流程快速複製做法。

## 適用情境

- 將 Google Drive、Google Sheet、Excel、PDF、手冊或專案資料轉成可操作的網頁。
- 建立工項追蹤、案件列管、進度填報、經費紀錄、資料總覽、查核點管理等內部工具。
- 需要 GitHub Pages 作為公開或半公開前端，並用 Apps Script / Google Sheet 作為後端資料表。

## 這次雲嘉南案例

工具位置：

`tools/yunjianan-progress/`

公開網址：

`https://junghan0711-dot.github.io/new-project/tools/yunjianan-progress/`

後端：

- Google Sheet：工項主檔、任務明細、進度更新紀錄、經費支出紀錄、案件追蹤列管
- Apps Script Web App：負責讀取資料與接收表單送出
- 前端 `config.js`：設定 API URL 與底表網址

已建立的主要功能：

- 任務填報
- 資料總覽
- 更新與費用紀錄
- 案件追蹤列管

## 標準流程

1. 釐清需求

   確認這個網頁要解決什麼管理問題，例如：

   - 誰要填報
   - 要追蹤哪些欄位
   - 是否要寫回 Google Sheet
   - 是否需要查核點、Deadline、指定同事、進度說明、費用紀錄
   - 是否可公開在 GitHub Pages

2. 定位資料來源

   公司與政府計畫資料優先依序查：

   - `/Users/junghanchiu/Documents/New project/CLAUDE.md`
   - `/Users/junghanchiu/2026 Data base/CLAUDE.md`
   - `/Users/junghanchiu/2026 Data base/專案庫/index.md`
   - 對應辦公室 `index.md`
   - 對應 `專案-*.md`
   - 必要時再讀附件、Google Drive、Google Sheet 或 PDF

3. 建立工具資料夾

   新網頁工具放在：

   `tools/<tool-name>/`

   建議基本檔案：

   - `index.html`
   - `styles.css`
   - `app.js`
   - `data.js`
   - `config.js`
   - `config.example.js`
   - `README.md`
   - `apps-script/Code.gs`
   - `apps-script/appsscript.json`
   - `apps-script/.clasp.json`

4. 設計前端頁籤

   常用頁籤：

   - 任務填報
   - 資料總覽
   - 更新與費用紀錄
   - 案件追蹤列管
   - 報表摘要
   - 附件與連結

   頁籤設計原則：

   - 第一頁就是可操作工具，不做空泛說明頁。
   - 每個頁籤對應明確工作流程。
   - 表單欄位要和 Google Sheet 表頭一致。
   - 查核、回報、Deadline、負責人要能被篩選。

5. 設計 Google Sheet 表頭

   常用工作表：

   - `工項主檔`
   - `任務明細`
   - `進度更新紀錄`
   - `經費支出紀錄`
   - `案件追蹤列管`

   `案件追蹤列管` 建議欄位：

   - 案件ID
   - 案件名稱
   - 指定同事
   - 交辦內容
   - 查核點
   - Deadline
   - 目前進度說明
   - 狀態
   - 優先序
   - 回報人
   - 回報時間
   - 備註

6. 建立 Apps Script API

   常用 API：

   - `GET action=health`：確認 API 是否可用
   - `GET action=listData`：讀取前端需要的所有資料
   - `POST action=submitProgress`：寫入進度回報
   - `POST action=submitItemProgress`：更新總工項
   - `POST action=submitCaseTracking`：新增案件追蹤列管

   注意：

   - Web App 設定通常使用「以我執行」。
   - 若要讓外部填報，存取權限需設定為「任何人，即使是匿名使用者」。
   - 不把憑證、token、金鑰放進 repo。
   - 正式資料表不要送測試資料，除非使用者明確同意。

7. 本機驗證

   啟動本機伺服器：

   ```bash
   python3 -m http.server 8017
   ```

   檢查：

   - 頁面是否載入
   - API 狀態是否顯示已連線
   - 筆數是否正確
   - 頁籤是否可切換
   - 表單欄位是否完整
   - 手機窄版是否不重疊

8. Apps Script 部署

   推送程式：

   ```bash
   cd tools/<tool-name>/apps-script
   npx -y @google/clasp push --force
   ```

   建立版本：

   ```bash
   npx -y @google/clasp version "版本說明"
   ```

   更新既有部署，避免 Web App URL 改變：

   ```bash
   npx -y @google/clasp deploy --deploymentId <deployment-id> --versionNumber <version> --description "版本說明"
   ```

   檢查 API：

   ```bash
   curl -L '<web-app-url>?action=health&callback=cb'
   curl -L '<web-app-url>?action=listData&callback=cb'
   ```

9. GitHub Pages 部署

   暫存、提交、推送：

   ```bash
   git add tools/<tool-name>
   git commit -m "Add <project> web tool"
   git push origin main
   ```

   檢查 Pages 狀態：

   ```bash
   gh api repos/junghan0711-dot/new-project/pages --jq '{status:.status, html_url:.html_url, source:.source}'
   ```

   檢查公開頁是否更新：

   ```bash
   curl -L 'https://junghan0711-dot.github.io/new-project/tools/<tool-name>/?v=<version>' | rg '<關鍵字>'
   ```

10. 收尾紀錄

   回報時包含：

   - 工具位置
   - 公開網址
   - 後端 Sheet / Apps Script 是否部署
   - API 是否驗證成功
   - 是否有送測試資料
   - Git commit hash
   - 尚未處理或需人工確認事項

## 可直接使用的指令範本

### 建立新的網頁工具

```text
幫我把「<專案名稱>」做成一個網頁版管理工具。
資料來源在「<Google Drive / Google Sheet / PDF / 本機路徑>」。
我要可以追蹤「<欄位或流程>」，並且要能寫回 Google Sheet。
請依照 docs/網頁工具建置SOP.md 的流程建立，放在 tools/<tool-name>/，完成後部署到 GitHub Pages。
```

### 新增一個頁籤或功能

```text
在「<工具名稱>」網頁後面新增一個「<頁籤名稱>」。
這個頁籤要可以記錄「<欄位列表>」，要能篩選「<篩選條件>」，並寫入 Google Sheet 的「<工作表名稱>」。
請同步更新前端、Apps Script、README，完成後部署。
```

### 建立案件追蹤列管

```text
幫我在這個網頁增加「案件追蹤列管」。
欄位要有案件名稱、指定同事、交辦內容、查核點、Deadline、目前進度說明、狀態、優先序、回報人、回報時間、備註。
送出後寫入 Google Sheet 的「案件追蹤列管」工作表，並可以依同事、狀態、關鍵字篩選。
```

### 只做檢查不送出資料

```text
幫我檢查這個網頁工具目前是否正常：
1. 本機頁面能不能開
2. GitHub Pages 是否是最新版
3. Apps Script API 是否回傳 ok
4. listData 是否讀到正確筆數
不要送出任何測試資料到正式 Google Sheet。
```

## 注意事項

- 不要把 `.env`、憑證、token、金鑰加入 git。
- 不要把大型附件或 Google Drive 同步資料夾整包加入 git。
- 正式 Google Sheet 不要任意寫測試資料。
- 新功能若需要寫入資料，優先先確認表頭設計。
- Web App URL 盡量沿用既有部署，避免公開網頁設定失效。
- 修改 `app.js` 後記得更新 `index.html` 的版本參數，避免瀏覽器快取舊版。
- GitHub Pages 部署後要等狀態從 `building` 變成 `built` 再確認公開頁。
