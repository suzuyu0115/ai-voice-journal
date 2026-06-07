---
description: テストを通す実装を行う（TDD GREEN フェーズ）
---

# /implement

## 安全ルール（絶対厳守）

- API キー・パスワード・トークン等をコードにハードコーディングしない
  - 環境変数は `EXPO_PUBLIC_*` 形式で `mobile/.env` に記載し、コードでは `process.env.EXPO_PUBLIC_XXX` で参照する
- `.env` ファイルはコミット対象に含めない（`.gitignore` で除外済み）
- 作業は現在のブランチで行う。main への直接コミットは禁止

## 手順

1. `/write-tests` で作成したテストファイルを確認する

2. CLAUDE.md のディレクトリ規約に従って実装ファイルを作成・編集する
   ```
   mobile/src/hooks/      # useXxx.ts
   mobile/src/lib/        # APIクライアント
   mobile/src/store/      # Zustand store
   mobile/src/components/ # UIコンポーネント
   mobile/app/            # 画面ファイル（expo-router）
   ```

3. テストをすべて PASS（GREEN）させる
   ```bash
   cd mobile && npm test -- --testPathPattern="対象ファイル名" --no-coverage
   ```

4. TypeScript 型エラーがないことを確認する
   ```bash
   cd mobile && npm run typecheck
   ```

5. ユーザーに以下を提示して承認を待つ：
   - 作成・編集したファイル一覧
   - 実装の概要（何をどう実装したか）
   - テスト PASS の確認結果
