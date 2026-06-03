# ai-voice-journal

AIと音声で会話しながら内省を深める日記アプリ。

## 構成

```
ai-voice-journal/
├── mobile/   # React Native + Expo（iOSアプリ）
└── api/      # Next.js API Routes（バックエンド）
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| モバイル | React Native + Expo (TypeScript) |
| 音声入力 | expo-av / expo-speech |
| AI会話 | Gemini 2.0 Flash |
| バックエンド | Next.js API Routes |
| DB / Auth | Supabase |
| デプロイ | Vercel（api）|

## 画面構成

1. **ホーム** - 過去の日記一覧
2. **会話** - AIと音声で対話（3〜5ターン）
3. **サマリー** - 感情スコアと振り返り文

## MVP目標

2026-06-19
