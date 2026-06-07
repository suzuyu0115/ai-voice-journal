---
description: Issue を作成してブランチを切る（プロジェクト自動追加・テストスケルトン作成まで）
---

以下の手順で Issue 作成からブランチ・テストスケルトン作成までを行ってください。

## 手順

### 1. Issue 作成
```bash
gh issue create \
  --repo suzuyu0115/ai-voice-journal \
  --title "【タイプ】タイトル" \
  --label "ラベル,MVP" \
  --body "本文"
```
GitHub Actions が自動で Project #6 に追加するため、手動追加は不要。

### 2. ブランチ作成
```bash
git checkout main
git pull origin main
git checkout -b feature/issue-{番号}-{短いタイトル}
```

### 3. テストファイル作成（実装前に必須）
対象ファイルに対応する `__tests__/xxx.test.ts` を作成し、`it.todo` でスケルトンを書く。

### 4. 実装後の PR 作成
```bash
gh pr create \
  --repo suzuyu0115/ai-voice-journal \
  --base main \
  --title "#{番号} タイトル" \
  --body "Closes #{番号} を含める"
```

## 重要ルール
- PR のマージはユーザーが行う（Claude は絶対にマージしない）
- Issue は PR マージ前にクローズしない
- main への直接コミット禁止
