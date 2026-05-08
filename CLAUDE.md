# New project — 我的班級工具總專案

## 對話開始時請先讀
進度與最近更動記錄在 Obsidian：`/Users/junghanchiu/Library/Mobile Documents/iCloud~md~obsidian/Documents/New project/工作筆記.md`。

## 工作模式
- **加新工具**：使用者說「我想做一個 XXX 工具」時，建立 `tools/<工具名>/` 子資料夾，並用可預覽、可上線的方式完成工具。
- **結束工作**：使用者說「收工」時，更新工作筆記、整理 git 變更、commit 並 push。
- **接續工作**：使用者說「開工」或「讀工作筆記、告訴我上次做到哪」時，摘要工作筆記、檢查 git 狀態，建議下一步。

## 工作桌 + 三個家
- 工作桌：`/Users/junghanchiu/Documents/New project`
- GitHub repo：`junghan0711-dot/new-project`（公開，網頁的家）
- Obsidian 駕駛艙：`/Users/junghanchiu/Library/Mobile Documents/iCloud~md~obsidian/Documents/New project/工作筆記.md`
- Firebase 專案：`my-teaching-tools-ea0ed`

## Firebase
- 專案 ID：`my-teaching-tools-ea0ed`
- Firestore database：`(default)`
- 已部署規則：`firestore.rules`
- 目前公開讀寫集合：`wordcloud_words`
- 其他集合預設禁止；新增工具若需要新集合，請先更新 `firestore.rules` 再部署。

## 工具清單
- （尚無）

## 工作注意事項
- 學生資料一律去識別化，只用座號、班級代號或隨機代碼，不存真名。
- commit 訊息要寫清楚做了什麼與為什麼。
- 收工前說「收工」，讓 Codex 同步工作筆記與 GitHub。
- 不要 commit `.claude/`、`.codex/`、`.env`、金鑰、token 或 credential 檔案。
