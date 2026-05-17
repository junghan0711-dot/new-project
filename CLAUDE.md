# New project — 公司經營與政府計畫管理專案

## 對話開始時請先讀
進度與最近更動記錄在 Obsidian：`/Users/junghanchiu/Library/Mobile Documents/iCloud~md~obsidian/Documents/New project/工作筆記.md`。

## 工作模式
- **公司經營管理優先**：所有工作以公司接案、政府計畫、營運管理、文件產製、專案追蹤與交付品質為核心，不再預設為班級工具或教學情境。
- **政府計畫文件**：計畫書、簡報、心智圖、圖片素材與輸出檔可依用途放在 `docs/`、`outputs/` 或專案專屬資料夾；命名要能看出案名、版本與用途。
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

## 工作注意事項
- 政府計畫、客戶資料、報價、契約、個資與未公開內容要謹慎處理；不要公開敏感資訊、金鑰、token 或 credential。
- 對外文件要注意版本、案名、日期、交付對象與可公開程度。
- commit 訊息要寫清楚做了什麼與為什麼。
- 收工前說「收工」，讓 Codex 同步工作筆記與 GitHub。
- 不要 commit `.claude/`、`.codex/`、`.env`、`.scripts/`、大型附件、金鑰、token 或 credential 檔案。
