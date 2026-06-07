---
description: 変更を確認してブランチへ commit・push する（確認付き）
---

# /commit-push

## 安全ルール（絶対厳守）

- **main への push は禁止**: push 先が `main` または `master` の場合は実行せず、ユーザーに警告する
- **ブランチ確認必須**: push 前に現在のブランチ名を必ず確認する
- **シークレット最終確認**: コミット対象に `.env`・API キー・認証情報が含まれていないことを確認してから進む
- `git add -A` は使わない。ファイルを個別に指定する

## 手順

1. 現在のブランチとコミット対象を確認する
   ```bash
   git branch --show-current
   git status
   git diff --stat
   ```

2. **ブランチが `main` または `master` の場合は即座に中止**してユーザーに警告する

3. コミット対象ファイルにシークレットが含まれていないか確認する
   ```bash
   git diff --cached
   git status --short
   ```
   `.env` やそれに類するファイルがステージされていたら**即座に中止**する

4. ユーザーに以下を提示して明示的な承認を得る：
   - push 先ブランチ名
   - コミット対象ファイル一覧
   - コミットメッセージ案

5. **承認を得てから**実行する
   ```bash
   git add {具体的なファイルパス}
   git commit -m "$(cat <<'EOF'
   {コミットメッセージ}

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   git push -u origin {feature/xxx または fix/xxx ブランチ}
   ```

6. push 完了後、PR 作成の要否をユーザーに確認する
