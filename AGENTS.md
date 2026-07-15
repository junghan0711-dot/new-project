# Codex Project Instructions

請依照 [CLAUDE.md](/Users/junghanchiu/Documents/New%20project/CLAUDE.md) 的公司經營與政府計畫管理工作模式進行。

重點：
- 所有工作以公司接案、政府計畫、營運管理、文件產製、專案追蹤與交付品質為核心，不預設為班級工具或教學情境。
- 公司相關作業優先從 `/Users/junghanchiu/2026 Data base` 提取資料；讀取順序為該資料夾的 `CLAUDE.md`、`專案庫/index.md`、對應辦公室 `index.md`、對應 `專案-*.md`，必要時才讀專案附件。
- 桃竹苗多元就業開發方案相關工作所需資料，必須連到 Google Drive 搜尋對應資料後，再進行後續處理。
- 雲嘉南辦公室共用 Google Drive（`https://drive.google.com/drive/folders/1jNaw1lhRfH8_wK_a6Y716rVwbvI02VVD`）為同仁持續更新的動態權威來源；處理任何雲嘉南相關事項時，必須先連線檢查最新目錄、檔案與修改狀態，再對照 `2026 Data base` 與本機副本。若有差異，以 Drive 最新版本為判斷基礎並標明查核時間，重大覆寫先確認。
- 政府計畫文件、簡報、心智圖、圖片素材與輸出檔可依用途放在 `docs/`、`outputs/` 或專案專屬資料夾。
- 使用者要新增內部管理工具、專案儀表板或可上線小系統時，放在 `tools/<tool-name>/`。
- 使用者說「開工」時，讀工作筆記（先看「交辦區」有無 Claude 交辦的事項）、檢查 git 狀態、建議下一步，不主動 pull。
- 多 AI 協作：與 Claude 無固定分工，任何工作都可承接，成果一律依回存原則彙整回 `2026 Data base`。要交辦對方或留給下個工作階段的事寫進工作筆記「交辦區」；commit 訊息開頭註明 `[codex]`；同一時間只讓一個 AI 修改 `2026 Data base`；改了 `.scripts/` 排程要同步更新該 vault 的 `知識庫/工具設定-本機自動化總覽.md`。
- 使用者說「收工」時，更新工作筆記、commit、push；不要加入本機設定或敏感檔案。
- 所有公司作業預設啟動「知識沉澱反射」，不必等待使用者另行要求：開始前先查 `/Users/junghanchiu/2026 Data base/知識庫/公司方法庫/index.md` 是否有可複用方法；完成後檢查是否可跨案重用、影響成本／品質／進度／客戶判斷、形成決策邏輯／風險規則／模板／SOP，或為既有方法提供新證據／反例。符合任兩項即主動建立或更新公司方法頁。
- 知識分流：當次事實與決策回寫對應專案；跨案原則進 `知識庫/公司方法庫/`；可直接操作的格式進 `Templates/` 或 `創作庫/`，並以 wikilink 雙向串聯。未驗證內容標為「想法」或「試行」，不得直接稱為公司標準；重大規範變更或敏感事項先確認。
- 新增或更新公司方法後，同步更新 `知識庫/index.md`、`知識庫/log.md`、方法頁成熟度與對應專案的 `related_knowledge`／進度紀錄。一次性、無複用價值的行政動作只記專案進度，不為形式製造知識頁。
- Firebase 專案是 `my-teaching-tools-ea0ed`，Firestore 規則在 `firestore.rules`。
- Obsidian 工作筆記在 `/Users/junghanchiu/Library/Mobile Documents/iCloud~md~obsidian/Documents/New project/工作筆記.md`。
- 不要把 `2026 Data base` 的大型附件、`.claude/`、`.codex/`、`.scripts/`、`.env`、憑證、金鑰或 token 加入 git。
