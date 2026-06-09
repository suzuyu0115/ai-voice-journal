# ai-voice-journal

AIと音声会話しながら内省を深める日記アプリ。MVP締め切り: 2026-06-19。

## プロジェクト構成

```
ai-voice-journal/
├── mobile/   # React Native + Expo（作業対象）
└── api/      # バックエンド（MVP では不使用）
```

作業は基本的に `mobile/` 配下で行う。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| モバイル | React Native + Expo 56 (TypeScript) |
| STT | `expo-speech-recognition`（iOS native、旧 `@react-native-voice/voice` は非推奨のため変更） |
| AI 会話 | Gemini API `gemini-2.5-flash`（テキストのみ） |
| TTS | `expo-speech` |
| 状態管理 | Zustand |
| DB / Auth | Supabase |
| ナビゲーション | expo-router + `@expo/vector-icons`（タブアイコン）|

## 主要コマンド

```bash
cd mobile
npm install
npx expo run:ios   # Expo Go 不可、dev build 必須（Xcode必須）
```

## 環境変数

`mobile/.env`（Git管理外）に記載。`mobile/.env.example` を参照。

```
EXPO_PUBLIC_GEMINI_API_KEY=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## 画面構成

| ファイル | 画面 |
|---------|------|
| `app/(tabs)/index.tsx` | ホーム（日記一覧） |
| `app/(tabs)/conversation.tsx` | 会話（メイン機能） |
| `app/(tabs)/calendar.tsx` | カレンダー（感情ヒートマップ）|
| `app/(tabs)/settings.tsx` | 設定 |
| `app/summary/[id].tsx` | サマリー（保存・確認、タブ外フルスクリーン） |

### ナビゲーション構成

```
app/
├── _layout.tsx          # ルート Stack（tabs + summary）
├── (tabs)/
│   ├── _layout.tsx      # 4タブ設定（Ionicons アイコン）
│   ├── index.tsx        # ホーム
│   ├── conversation.tsx # 会話
│   ├── calendar.tsx     # カレンダー
│   └── settings.tsx     # 設定
└── summary/
    └── [id].tsx         # サマリー（タブバーなし）
```

## 会話フロー（コア機能）

```
ボタン長押し → STT開始（リアルタイム文字起こし表示）
指を離す   → Gemini API にテキスト送信 → expo-speech で音声再生
2〜3 ターン繰り返す → 「まとめる」ボタン → サマリー生成 → Supabase 保存
```

## ディレクトリ規約

```
mobile/src/
├── hooks/       # useVoiceRecorder.ts, useJournalChat.ts
├── lib/         # gemini.ts, supabase.ts（APIクライアント）
├── store/       # journalStore.ts（Zustand）
└── components/  # RecordButton, ChatBubble, WaveformAnimation
```

## 注意事項

- `.env` は絶対にコミットしない（`.gitignore` で除外済み）
- Expo Go では動作しない（`expo-speech-recognition` がネイティブモジュールのため）
- `api/` は MVP では触らない
- 実装はチケット（GitHub Issues）単位で進める

---

## 開発ワークフロー（必ず守ること）

### Issue → Branch → PR の順序

```
1. Issue 作成（gh issue create）
2. ブランチ作成（feature/issue-X-タイトル）
3. テストファイル作成（it.todo スケルトン）※実装前に必須
4. 実装
5. push（pre-push hook: lint・coverage・e2e が自動実行）
6. PR 作成（gh pr create）
7. ユーザーがレビュー・マージ
```

### Claude が絶対にやってはいけないこと

- **PR のマージは絶対に行わない**（必ずユーザーが行う）
- **Issue を PR マージ前にクローズしない**（`Closes #X` を PR に書けば自動クローズされる）
- **main ブランチに直接コミット・push しない**（修正・機能追加・ドキュメント更新を含む全ての変更は必ずブランチを切ること）
- **シークレットキー・APIキー・パスワードを絶対にコードにハードコーディングしない**（`.env` に記載、`process.env` 経由で参照）
- **`.env` ファイルを絶対にコミット・push しない**（`.gitignore` で除外済みだが、意図的な追加も禁止）
- **`git add .` や `git add -A` を使わない**（`.env` などを誤って含めるリスクがあるため、必ずファイルを明示して `git add`）

### ブランチ運用ルール

- 全ての作業は必ずブランチを切ってから開始する
- ブランチ名は `feature/issue-X-タイトル` または `fix/issue-X-タイトル` 形式
- main への直接 push は **いかなる理由があっても禁止**（緊急修正も同様）

### Issue 作成時のルール

```bash
# Issue 作成（GitHub Actions が自動でプロジェクトに追加する）
gh issue create \
  --repo suzuyu0115/ai-voice-journal \
  --title "【タイプ】タイトル" \
  --label "ラベル,MVP"

# ※ GitHub Actions（.github/workflows/add-to-project.yml）が
#   新規 Issue・PR を自動で Project #6 に追加する
#   → 手動での project 追加は不要
```

### PR 作成時のルール

```bash
gh pr create \
  --repo suzuyu0115/ai-voice-journal \
  --base main \
  --title "#X タイトル" \
  --body "Closes #X を必ず含める"
```

- **base は常に `main`**（依存ブランチがある場合はその旨を PR に明記）
- PR body に `Closes #X` を必ず記載する
- PR 番号と Issue 番号は別物（混同しない）

### カバレッジルール

- 新しい `src/` ファイルを追加したら、同時にテストファイルも作成する
- 実装前に `it.todo` スケルトンを書く
- push 前に coverage 80% 以上を維持する（pre-push hook で自動チェック）
- `src/lib/supabase.ts` と `app/` はカバレッジ対象外（設定済み）

---

## 現在の実装状況（2026-06-09時点）

### 完了済み
- Expo SDK 56 プロジェクト作成（`mobile/`）
- 全パッケージインストール済み: expo-router, expo-sqlite, expo-av, expo-notifications, expo-haptics, async-storage, zustand, @google/genai, expo-speech, expo-speech-recognition, @supabase/supabase-js, @expo/vector-icons
- app.json 設定済み（scheme, マイク権限, expo-speech-recognition plugin）
- GitHub リポジトリ作成・push済み
- `src/lib/gemini.ts`・`src/lib/supabase.ts`・`src/store/journalStore.ts` 作成済み
- **#19** フッターナビゲーションバー実装済み（4タブ: ホーム・会話・カレンダー・設定）
- **#16** 会話機能フル実装（STT・Gemini・TTS・UI）→ PR レビュー待ち

### コードの状態
- `app/(tabs)/` 配下に4画面（index, conversation, calendar, settings）
- `app/summary/[id].tsx` スケルトン（#8 で実装予定）
- `src/hooks/useVoiceRecorder.ts`・`src/hooks/useJournalChat.ts` 実装済み
- `src/components/RecordButton.tsx`・`src/components/ChatBubble.tsx` 実装済み

### 次のステップ
- **#16** PR マージ（会話機能）
- **#8** サマリー生成・感情スコア（#16 マージ後）
- **#9** 日記一覧・Supabase 保存・ストリーク

---

## GitHub

- リポジトリ: https://github.com/suzuyu0115/ai-voice-journal
- Project（カンバン）: https://github.com/users/suzuyu0115/projects/6
- Issues: https://github.com/suzuyu0115/ai-voice-journal/issues

## Issue一覧（MVP）

| # | タイトル | ラベル | 状態 |
|---|---------|--------|------|
| #1 | 残パッケージ・プロジェクト基盤構築 | setup | 完了 |
| #2 | Supabaseセットアップ | setup | 完了 |
| #3 | 3画面スケルトン作成 | setup | 完了 |
| #4 | STT実装 | feature | 完了（#16に統合）|
| #5 | Gemini API連携・会話管理 | feature | 完了（#16に統合）|
| #6 | TTS実装 | feature | 完了（#16に統合）|
| #7 | 会話UI実装 | feature | 完了（#16に統合）|
| #8 | サマリー生成・感情スコア | feature | 未着手 |
| #9 | 日記一覧・Supabase保存・ストリーク | feature | 未着手 |
| #16 | 会話機能フル実装（STT・Gemini・TTS・UI）| feature | PR レビュー待ち |
| #19 | フッターナビゲーションバー実装 | feature | PR レビュー待ち |

## 推奨着手順序

1. ~~#1〜#7~~ 完了済み
2. **#16** PR マージ（会話機能）
3. **#8** サマリー生成・感情スコア（#16 マージ後）
4. **#9** 日記一覧・Supabase 保存・ストリーク
5. **#19** フッターナビゲーション PR マージ
