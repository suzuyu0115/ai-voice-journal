---
description: 実装が Issue の要件を満たしているか AI が内部レビューする
---

# /ai-review

## 手順

1. レビュー対象を収集する
   ```bash
   gh issue view {Issue番号} --repo suzuyu0115/ai-voice-journal
   git diff main...HEAD
   git diff main...HEAD --name-only
   ```

2. 以下の観点で実装をレビューする

   ### 要件充足チェック
   - Issue に記載された要件・完了条件をすべて満たしているか
   - CLAUDE.md の会話フロー・画面構成と矛盾していないか

   ### セキュリティチェック（必須）
   - API キー・シークレットのハードコーディングがないか
   - `.env` ファイルや認証情報がコミット対象に含まれていないか
   - `git diff main...HEAD` の出力に `EXPO_PUBLIC_` の実際の値が含まれていないか

   ### コード品質チェック
   - TypeScript の型が適切か（`any` の乱用がないか）
   - CLAUDE.md のディレクトリ規約に従っているか
   - 不要なコメント・console.log が残っていないか

   ### テストチェック
   - テストが実装の振る舞いを適切にカバーしているか
   - エッジケースの考慮漏れがないか

3. レビュー結果をユーザーに提示する
   - **PASS** の場合: 問題なしと報告し、次のフェーズへの承認を求める
   - **FAIL** の場合: 指摘事項を箇条書きで列挙し、`/implement` に戻って修正を求める
   - セキュリティ問題は 1 件でも FAIL とする
