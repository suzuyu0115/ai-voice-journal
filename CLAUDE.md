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
| STT | `@react-native-voice/voice`（iOS native） |
| AI 会話 | Gemini API `gemini-2.5-flash`（テキストのみ） |
| TTS | `expo-speech` |
| 状態管理 | Zustand |
| DB / Auth | Supabase |
| ナビゲーション | expo-router |

## 主要コマンド

```bash
cd mobile
npm install
npx expo run:ios   # Expo Go 不可、dev build 必須
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
- Expo Go では動作しない（`@react-native-voice/voice` がネイティブモジュールのため）
- `api/` は MVP では触らない
- 実装はチケット（GitHub Issues）単位で進める
