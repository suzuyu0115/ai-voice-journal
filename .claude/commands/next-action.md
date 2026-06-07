---
description: オープンな Issue を調査し、次に着手すべきタスクと実装方針を提示する
---

# /next-action

## 手順

1. オープンな Issue と現在のブランチを確認する
   ```bash
   gh issue list --repo suzuyu0115/ai-voice-journal --state open --json number,title,labels,body
   git branch --show-current
   git log --oneline -5
   ```

2. CLAUDE.md の「推奨着手順序」と照合して優先度を判断する

3. 以下をユーザーに提示して承認を待つ：
   - **着手推奨 Issue**: 番号・タイトル・理由
   - **実装方針**: 何を作るか・どこに置くか（ディレクトリ規約に沿って）
   - **作成予定ファイル一覧**
   - **完了条件**: このIssueが「完了」と言える状態の定義
