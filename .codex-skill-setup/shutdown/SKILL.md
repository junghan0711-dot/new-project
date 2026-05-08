---
name: shutdown
description: 收工同步助手。當使用者說「收工」、「結束了」、「準備換電腦」、「該同步的同步」、「先到這裡」等任何要結束工作並同步的請求時，使用此技能；更新 Obsidian 工作筆記、整理 git 變更、commit 並 push。
---

# 收工同步助手

對話結束前，把今天的工作保存到工作資料夾、Obsidian 工作筆記與 GitHub。

## 原則

- 只同步有實質進度的工作。
- commit 前先檢查 `git status --short`，避免加入本機設定或敏感檔案。
- 不 commit `.claude/`、`.codex/`、`.env`、token、credential、service account key。
- 若 GitHub CLI 未登入或 remote 未設定，先回報阻塞點，仍可更新本機工作筆記。

## SOP

1. 盤點本次完成的檔案、決策與踩坑。
2. 找工作目錄與工作筆記：
   - 工作目錄通常是 `$PWD`
   - Obsidian 工作筆記優先依 `CLAUDE.md` 記錄的路徑
   - 若找不到工作筆記，詢問使用者 vault 路徑
3. 更新工作筆記：
   - 「上次做到哪」寫最後狀態
   - 「最近更動紀錄」新增今天一行
   - 有新坑才更新「踩坑筆記」
4. Git 同步：
   - `git status --short`
   - `git add` 今天動到且可公開的檔案
   - `git commit -m "<清楚摘要>"`
   - `git push origin HEAD`
5. 回報同步狀態：工作資料夾、Obsidian、GitHub 各自成功或阻塞原因。

## Commit Message

- 標題行用「動詞 + 對象」。
- 正文用 3-5 條 bullet 說明變動與原因。
