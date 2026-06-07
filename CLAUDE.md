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
| ナビゲーション | expo-router |

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
| `app/index.tsx` | ホーム（日記一覧） |
| `app/conversation.tsx` | 会話（メイン機能） |
| `app/summary/[id].tsx` | サマリー（保存・確認） |

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

## 現在の実装状況（2026-06-07時点）

### 完了済み
- Expo SDK 56 プロジェクト作成（`mobile/`）
- 全パッケージインストール済み: expo-router, expo-sqlite, expo-av, expo-notifications, expo-haptics, async-storage, zustand, @google/genai, expo-speech, expo-speech-recognition, @supabase/supabase-js
- app.json 設定済み（scheme, マイク権限, expo-speech-recognition plugin）
- GitHub リポジトリ作成・push済み
- GitHub Issues 作成済み（#1〜#9）
- GitHub Project 作成済み（Issues紐付け済み）
- Xcode インストール中
- `app/` ディレクトリ・3画面スケルトン作成済み（#1・#3 完了）
- `src/lib/gemini.ts`・`src/lib/supabase.ts`・`src/store/journalStore.ts` 作成済み
- `package.json` の `main` を `expo-router/entry` に変更済み

### コードの状態
- `app/_layout.tsx`・`app/index.tsx`・`app/conversation.tsx`・`app/summary/[id].tsx` スケルトン作成済み
- `src/hooks/`・`src/components/` は未実装（#4〜#7 で対応）
- `mobile/.env` は未作成（APIキー設定が必要）

### 次のステップ
- **#2** Supabaseセットアップ（ブラウザでテーブル作成 → `.env` に記載）
- Xcode インストール完了後 → `npx expo run:ios` で動作確認

---

## GitHub

- リポジトリ: https://github.com/suzuyu0115/ai-voice-journal
- Project（カンバン）: https://github.com/users/suzuyu0115/projects/6
- Issues: https://github.com/suzuyu0115/ai-voice-journal/issues

## Issue一覧（MVP）

| # | タイトル | ラベル |
|---|---------|--------|
| #1 | 残パッケージ・プロジェクト基盤構築 | setup |
| #2 | Supabaseセットアップ | setup |
| #3 | 3画面スケルトン作成 | setup |
| #4 | STT実装 | feature |
| #5 | Gemini API連携・会話管理 | feature |
| #6 | TTS実装 | feature |
| #7 | 会話UI実装 | feature |
| #8 | サマリー生成・感情スコア | feature |
| #9 | 日記一覧・Supabase保存・ストリーク | feature |

## 推奨着手順序

1. **#1** 残パッケージインストール・expo-router初期化（Xcodeインストール完了後に `npx expo run:ios` で動作確認）
2. **#2** Supabaseセットアップ（ブラウザで完結、Xcode不要）
3. **#3** 3画面スケルトン
4. **#4** STT実装
5. **#5** Gemini API連携
6. **#6** TTS実装
7. **#7** 会話UI
8. **#8** サマリー生成
9. **#9** 日記一覧・保存
