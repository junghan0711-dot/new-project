# New project 工作規則

本工作區是公司文件產製、政府計畫管理與內部工具開發的工作桌；不預設為班級或教學工具。

## 工作區與資料來源

- 工作桌：`/Users/junghanchiu/Documents/New project`
- 公司正式資料庫：`/Users/junghanchiu/2026 Data base`
- 工作筆記：`/Users/junghanchiu/Library/Mobile Documents/iCloud~md~obsidian/Documents/New project/工作筆記.md`
- 公開 GitHub repo：`junghan0711-dot/new-project`
- 公司作業先讀 `2026 Data base/AGENTS.md`、`專案庫/index.md`、目標辦公室 `AGENTS.md`／`index.md`、對應 `專案-*.md`；只有查證或交付需要時才讀附件。
- 桃竹苗多元就業開發方案與雲嘉南辦公室工作，必須先查對應 Google Drive 最新版本；Drive 與本機不一致時，以 Drive 為判斷基礎並標明查核時間，重大覆寫先確認。

## 核心工作原則

- 特定專案的正式成果回存 `2026 Data base/專案庫/` 對應專案並更新文件索引或進度；`outputs/` 只作產製副本。
- 公司工項開始前查 `2026 Data base/知識庫/公司方法庫/index.md`；完成後依該 vault 規則判斷是否沉澱跨案方法。一次性行政動作不為形式建立方法頁。
- 新內部工具、儀表板或可上線系統放在 `tools/<tool-name>/`；Firebase 專案為 `my-teaching-tools-ea0ed`。
- 對外文件須確認版本、案名、日期、交付對象與公開程度；政府資料、客戶資料、報價、契約及個資不得誤入公開 repo。
- Claude 與 Codex 無固定分工；同一時間只讓一個 AI 修改 `2026 Data base`。跨工具交辦寫入工作筆記「交辦區」。
- 修改 `2026 Data base/.scripts/` 排程時，同步更新 `知識庫/工具設定-本機自動化總覽.md`。

## 工作流程路由

- 「開工／接續工作」使用 `startup` Skill：讀工作筆記、先看交辦區、檢查 Git，不主動 pull。
- 「收工／結束工作」使用 `shutdown` Skill：更新工作筆記，僅提交本次且可公開的變更，以 `[codex]` 或 `[claude]` 開頭 commit，再 push。
- 專案建立、文件歸檔、專案頁、進度與待辦管理使用 `project-management` Skill。
- 簡報與 Apple 風格產出使用 `apple-design-studio`；文件、試算表、PDF 等使用對應 artifact Skill，並完成其驗證流程。
- 特定資料夾若有較近一層 `AGENTS.md`，以該檔案補充或覆蓋本檔規則。

## Git 與安全

- 不提交 `.claude/`、`.codex/`、`.scripts/`、`.env`、憑證、金鑰、token、QA 暫存或未公開大型附件。
- 保留使用者既有及無關變更；不使用破壞性 Git 指令清除工作樹。
- 提交前執行專案 hook；hook 擋下時先處理原因，不以略過檢查作為預設解法。
