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
| AI 会話・STT・TTS | Gemini Live API `gemini-2.5-flash-preview-native-audio`（リアルタイム双方向音声）|
| 状態管理 | Zustand |
| DB / Auth | Supabase（匿名認証・RLS 有効）|
| ナビゲーション | expo-router + `@expo/vector-icons`（タブアイコン）|
| カレンダー | `react-native-calendars` |
| スプラッシュ | `expo-splash-screen` |

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
| `app/(tabs)/calendar.tsx` | カレンダー（月間カレンダー・日記プレビュー）|
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
    └── [id].tsx         # サマリー（タブ外・BottomTabBar を手動マウント）
```

## 会話フロー（コア機能）

```
マイクボタンをタップ → Gemini Live WebSocket 接続、リアルタイム音声入出力開始
会話中             → AI の発話と文字起こしがリアルタイムで画面に表示される
自動終了 or 「まとめる」ボタン → WebSocket 切断、pendingMessages を保存
                              → サマリー画面へ遷移
```

### 会話終了ロジック

- `turnComplete` ごとに `rallyCountRef` をインクリメント
- `MAX_RALLIES (= 3)` 到達時 → ラップアップ指示テキストを Gemini に送信（`isWrappingUpRef` で二重送信防止）
- AI が `[END]` マーカーを返したとき → `finishConversation()` でサマリー画面へ遷移
- 「まとめる」ボタン押下時も即座に `finishConversation()`

## ディレクトリ規約

```
mobile/src/
├── hooks/       # useGeminiLive.ts, useAuth.ts, useSummary.ts, useCalendarEntries.ts, useDiaryEntry.ts, useDiaryList.ts
├── lib/         # gemini.ts, supabase.ts（APIクライアント）
├── store/       # journalStore.ts（Zustand）
└── components/  # BottomTabBar
```

## 注意事項

- `.env` は絶対にコミットしない（`.gitignore` で除外済み）
- Expo Go では動作しない（Gemini Live がネイティブ Audio API を使うため）
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

## 現在の実装状況（2026-06-19時点）

### 完了済み（main にマージ済み）
- Expo SDK 56 プロジェクト作成（`mobile/`）
- 全パッケージインストール済み: expo-router, expo-av, expo-haptics, async-storage, zustand, @google/genai, @supabase/supabase-js, @expo/vector-icons, react-native-calendars, expo-splash-screen
- app.json 設定済み（scheme, マイク権限, スプラッシュ背景色）
- GitHub リポジトリ作成・push済み
- `src/lib/gemini.ts`・`src/lib/supabase.ts`・`src/store/journalStore.ts` 作成済み
- **#19** フッターナビゲーションバー（4タブ: 会話・ホーム・カレンダー・設定）
- **#8** サマリー画面実装（Gemini によるタイトル+本文生成・編集モード・Supabase 保存・会話履歴表示）
- **#21** カレンダー画面実装（月間カレンダー・日記エントリープレビュー）
- **#31** 設定画面実装（iOS Settings スタイル UI・アプリバージョン表示・各機能プレースホルダー）
- **#30** カレンダーから日記詳細表示（`summary/[id].tsx` を表示モード／作成モードの2モードに対応）
- **#34** 日記詳細編集・保存機能（タイトル・本文のインライン編集）
- **#35** 日記詳細ヘッダー UI 改善（日付表示・戻るボタン）
- **#37** 日記詳細削除ボタン（確認ダイアログ付き）
- **#40** 開発用シードデータ投入スクリプト（`mobile/scripts/seed.ts`）
- **#9** ホーム画面を日記一覧（ジャーナルスタイル）に刷新（Supabase 取得・連続記録ストリーク、PR #44）
- **#42** 会話機能を Gemini Live API に刷新（リアルタイム双方向音声・`useGeminiLive.ts`、PR #43）
- **#55** Gemini Live 音声応答タイミング改善（エコー・遮り防止、PR #56）
- **#50** カレンダー画面から日記を追加（FAB マイクボタン、PR #51）
- **#45/#47/#49** 日付選択・カレンダーピッカー・匿名認証によるユーザーデータ分離（PR #52）
- **#58** ストリーク表示を Duolingo 風大型カードにリデザイン（PR #59）
- **#62** Supabase user_id NULL バグ修正・RLS 有効化・シードデータ更新（PR #63）
- **#64** UI改善: カレンダー月切替スライドアニメーション・スワイプ・ヘッダータイトル中央寄せ・会話タブをメインに変更（PR #66）

### オープン PR（未マージ）
- **PR #68** (#67): 起動時スプラッシュスクリーン（フェードイン・ホールド・フェードアウト 計約2秒）

### コードの状態
- `app/_layout.tsx`: 起動時に匿名認証 + `expo-splash-screen` でスプラッシュ制御。`AppSplash` コンポーネントが認証完了後に約2秒表示
- `app/(tabs)/_layout.tsx`: 会話タブが1番目（メイン）。`headerTitleAlign: 'center'`
- `app/(tabs)/conversation.tsx`: Gemini Live UI（マイクボタン・ステータス表示・会話バブル）
- `app/(tabs)/index.tsx`: 日記一覧（ジャーナルスタイル）、Duolingo 風ストリークカード固定表示（ステージ別カラー）
- `app/(tabs)/calendar.tsx`: スライドアニメーション＋スワイプジェスチャーで月切替。キャッシュ済み月はインスタント表示。FAB でその日の日記作成
- `app/summary/[id].tsx`: **2モード対応**（表示モード／作成モード）。ヘッダー日付タップでカレンダーモーダル
- `src/hooks/useGeminiLive.ts`: Gemini Live WebSocket、`isWrappingUpRef` パターンで会話終了管理
- `src/hooks/useCalendarEntries.ts`: モジュールレベルの `entriesCache (Map)` でフェッチ済み月をキャッシュ
- `src/hooks/useAuth.ts`: Supabase 匿名認証フック
- `src/hooks/useSummary.ts`: `entryDate`/`setEntryDate`（`targetDate` から初期化）
- `src/hooks/useDiaryList.ts`: ホーム画面用日記一覧取得（Supabase、フォーカス時リフレッシュ）
- `src/hooks/useDiaryEntry.ts`: 日記詳細取得・削除
- `src/lib/supabase.ts`: `insertDiaryEntry` が `user_id` を自動セット。`updateDiaryEntry`・`deleteDiaryEntry` 追加
- `src/store/journalStore.ts`: `pendingMessages`・`targetDate`/`setTargetDate` 管理
- `src/components/BottomTabBar.tsx` のみ残存（`RecordButton`・`ChatBubble` は #42 で削除済み）
- 実機ビルド確認済み（bundleIdentifier: com.suzuyu0115.aivoicejournal、Personal Team 署名）

### Supabase diary_entries テーブル構成
| カラム | 型 | 備考 |
|--------|-----|------|
| id | uuid | PK, auto |
| created_at | timestamptz | auto |
| user_id | uuid | auth.uid()（DB トリガーで自動セット）|
| title | text | NOT NULL, max 50字 |
| conversation_log | jsonb | `[{role, text}]` |
| diary_text | text | AI生成本文 |
| tags | text[] | |

RLS: 有効（`auth.uid() = user_id` ポリシー、匿名認証対応済み）

### 次のステップ
- PR #68 (#67 スプラッシュスクリーン) をユーザーがレビュー・マージ → MVP 完成

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
| #8 | サマリー生成・タイトル+本文・Supabase保存 | feature | 完了（PR #24）|
| #9 | 日記一覧・Supabase保存・ストリーク | feature | 完了（PR #44）|
| #16 | 会話機能フル実装（STT・Gemini・TTS・UI）| feature | 完了（#42 で置き換え）|
| #19 | フッターナビゲーションバー実装 | feature | 完了 |
| #21 | カレンダー画面実装（GitHub草スタイル→日記プレビュー）| feature | 完了 |
| #30 | カレンダーから日記詳細画面にアクセス | fix | 完了（PR #32）|
| #31 | 設定画面実装（iOS Settings スタイル UI）| feature | 完了（PR #27）|
| #34 | 日記詳細画面に編集・保存機能を追加 | fix | 完了 |
| #35 | 日記詳細ヘッダー UI 改善（日付表示・戻るボタン） | fix | 完了（PR #36）|
| #37 | 日記詳細画面に削除ボタンを実装 | feature | 完了（PR #38）|
| #40 | 開発用シードデータ投入スクリプト | chore | 完了（PR #41）|
| #42 | Gemini Live API による双方向音声会話に刷新 | feature | 完了（PR #43）|
| #45 | 日記の日付を今日/昨日/一昨日から選択 | feature | 完了（PR #52）|
| #47 | ヘッダー日付タップでカレンダーピッカー | feature | 完了（PR #52）|
| #49 | 匿名認証でユーザーデータを分離 | feature | 完了（PR #52）|
| #50 | カレンダー画面から日記を追加（FAB） | feature | 完了（PR #51）|
| #53 | CLAUDE.md ドキュメント更新 | docs | 完了（PR #54）|
| #55 | Gemini Live 音声応答タイミング改善 | fix | 完了（PR #56）|
| #58 | ストリーク表示を Duolingo 風にリデザイン | feature | 完了（PR #59）|
| #62 | Supabase user_id NULL バグ修正・RLS 有効化 | fix | 完了（PR #63）|
| #64 | UI改善（カレンダースライド・タブ順序・ヘッダー） | feature | 完了（PR #66）|
| #67 | 起動時スプラッシュスクリーン | feature | PR #68（レビュー待ち）|

## 推奨着手順序

1. ~~#1〜#9, #16, #19, #21, #30〜#35, #37, #40, #42, #45, #47, #49, #50, #53, #55, #58, #62, #64~~ 完了済み
2. PR #68 (#67 スプラッシュスクリーン) をマージ → MVP 完成
