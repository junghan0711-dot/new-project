# New project — 公司經營與政府計畫管理專案

## 對話開始時請先讀
進度與最近更動記錄在 Obsidian：`/Users/junghanchiu/Library/Mobile Documents/iCloud~md~obsidian/Documents/New project/工作筆記.md`。

## 工作模式
- **公司經營管理優先**：所有工作以公司接案、政府計畫、營運管理、文件產製、專案追蹤與交付品質為核心，不再預設為班級工具或教學情境。
- **政府計畫文件**：計畫書、簡報、心智圖、圖片素材與輸出檔可依用途放在 `docs/`、`outputs/` 或專案專屬資料夾；命名要能看出案名、版本與用途。
- **專案資料回存原則**：若產出內容屬於特定委辦單位或專案，完成後要同步歸檔到 `/Users/junghanchiu/2026 Data base/專案庫/` 的對應辦公室與專案資料夾，並更新對應 `專案-*.md` 的文件索引或進度紀錄；`New project/outputs` 可保留產製副本，但不作為唯一保存位置。
- **加新系統或工具**：若使用者要做內部管理工具、專案儀表板或可上線的小系統，建立 `tools/<工具名>/` 子資料夾，並用可預覽、可上線的方式完成。
- **結束工作**：使用者說「收工」時，更新工作筆記、整理 git 變更、commit 並 push。
- **接續工作**：使用者說「開工」或「讀工作筆記、告訴我上次做到哪」時，摘要工作筆記、檢查 git 狀態，建議下一步。

## 工作桌 + 三個家
- 工作桌：`/Users/junghanchiu/Documents/New project`
- GitHub repo：`junghan0711-dot/new-project`（公開，網頁的家）
- Obsidian 駕駛艙：`/Users/junghanchiu/Library/Mobile Documents/iCloud~md~obsidian/Documents/New project/工作筆記.md`
- 公司作業首要資料來源：`/Users/junghanchiu/2026 Data base`
- Firebase 專案：`my-teaching-tools-ea0ed`

## 公司作業資料讀取順序
處理公司經營、政府委辦、地方創生、標案、月報、成果報告、專案管理、營運管理或交付文件時，先從 `2026 Data base` 提取資料，再回到本 repo 補充交付檔案。

1. 先讀 `/Users/junghanchiu/2026 Data base/CLAUDE.md`，確認該 vault 的工作規則。
2. 再讀 `/Users/junghanchiu/2026 Data base/專案庫/index.md`，掌握全公司專案總覽。
3. 依任務讀對應辦公室 `index.md`（北部、中部、南部）。
4. 依案名讀對應 `專案-*.md`。
5. 只有需要查證內容或產製交付文件時，才讀專案附件資料夾；不要主動搬移、複製或整理 `2026 Data base` 的大型附件。

### 雲嘉南辦公室最新資料來源
- 雲嘉南辦公室共用 Google Drive：`https://drive.google.com/drive/folders/1jNaw1lhRfH8_wK_a6Y716rVwbvI02VVD`
- 同仁會持續更新該資料夾；凡處理雲嘉南辦公室、多元就業開發方案、多元培力、活動、市集、月報、報支、收發文或相關交付事項，必須先連線檢查此 Drive 的最新目錄、檔案與修改狀態，再對照 `2026 Data base` 與本機產製副本。
- Google Drive 為動態權威來源；本機同步檔與既有輸出只作為快照。若內容不一致，以 Drive 最新版本為判斷基礎，並標明查核時間及差異，涉及覆寫或重大決策時先請使用者確認。

## Firebase
- 專案 ID：`my-teaching-tools-ea0ed`
- Firestore database：`(default)`
- 已部署規則：`firestore.rules`
- 目前公開讀寫集合：`wordcloud_words`
- 其他集合預設禁止；新增管理系統或工具若需要新集合，請先更新 `firestore.rules` 再部署。

## 專案資產
- `docs/`：政府計畫文件、企劃書、版本稿與相關素材。
- `outputs/`：圖表、匯出圖片、轉檔成果與可交付輸出。
- `tools/`：需要互動式網頁、內部管理功能或可部署系統時再建立。

## 簡報風格偏好
- 預設採用 Apple-inspired keynote 風格：極簡、留白多、少字、大圖、節奏清楚。
- 每張投影片只傳達一個核心訊息；標題要短、有力，避免公文式長句。
- 優先使用大圖、產品畫面、數據焦點或一句關鍵話，而不是密集條列。
- 色彩以黑、白、深灰為基底，搭配少量高飽和重點色；避免視覺雜訊。
- 中文字體優先使用現代無襯線風格，例如 PingFang TC、Noto Sans TC 或思源黑體。
- 版面節奏可採「大標題 → 視覺證據 → 關鍵數字 → 結論/行動」。
- 動畫與轉場保持克制，只用於強化敘事，不做裝飾。
- 政府計畫或公司提案仍須保留必要資訊完整性，但呈現上避免傳統密集報告感，優先做成可正式提案、簡報發表與對外溝通的高質感版本。

## 多 AI 協作（Claude × Codex）
- 無固定分工：Claude 與 Codex 都可以承接任何工作（文件產製、簡報、程式開發、知識整理），共用同一套規則，成果都依「專案資料回存原則」彙整回 `2026 Data base`。
- 跨工具交辦：不屬於自己主場的工作，寫進工作筆記的「交辦區」（註明交辦方、日期、檔案路徑與脈絡），接手方完成後把該條移入「最近更動紀錄」。開工時先看交辦區。
- commit 訊息開頭註明操作者：`[claude] ...` 或 `[codex] ...`。
- 單一寫手原則：同一時間只讓一個 AI 修改 `2026 Data base`（該 vault 有 obsidian-git 自動 commit，並行寫入會衝突）。
- 修改 `2026 Data base/.scripts/` 的排程後，必須同步更新該 vault 的 `知識庫/工具設定-本機自動化總覽.md`。

## 工作注意事項
- 政府計畫、客戶資料、報價、契約、個資與未公開內容要謹慎處理；不要公開敏感資訊、金鑰、token 或 credential。
- 對外文件要注意版本、案名、日期、交付對象與可公開程度。
- commit 訊息要寫清楚做了什麼與為什麼。
- 收工前說「收工」，讓 Codex 同步工作筆記與 GitHub。
- 不要 commit `.claude/`、`.codex/`、`.env`、`.scripts/`、大型附件、金鑰、token 或 credential 檔案。
