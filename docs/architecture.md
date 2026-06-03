# アーキテクチャ設計書

## 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| モバイル | React Native + Expo (TypeScript) | iOS Simulator でデモ |
| 音声入力 | expo-av | 録音 |
| 音声出力 | expo-speech | TTS |
| AI会話 | Gemini 2.0 Flash | Google AI Studio |
| バックエンド | Next.js API Routes | Vercel にデプロイ |
| DB | Supabase (PostgreSQL) | リレーショナル構造に適合 |
| Auth | Supabase Auth | |
| ホスティング | Vercel | |

## インフラ選定理由

- このアプリのスケール・要件に対して必要十分
- Supabase Auth が Cognito より設定がシンプル
- Vercel Edge Functions は Lambda より低レイテンシ（API プロキシ用途）
- Supabase の DX（管理画面・RLS・自動生成API）が開発速度に貢献
- 無料枠で MVP 全体をカバー可能

## アーキテクチャ図

```
┌──────────────────────────────────────┐
│         Expo App (iOS Simulator)      │
│                                      │
│  ┌──────────┐      ┌──────────────┐  │
│  │ ホーム    │      │  会話画面     │  │
│  │（日記一覧）│─────▶│（録音・対話）  │  │
│  └──────────┘      └──────┬───────┘  │
│                           │          │
│               expo-av で録音           │
│               expo-speech で再生       │
└───────────────────────────┼──────────┘
                            │ HTTPS
              ┌─────────────▼────────────────┐
              │   Next.js API Routes          │
              │   (Vercel)                    │
              │   /api/chat   /api/summary    │
              └──────┬──────────┬────────────┘
                     │          │
          ┌──────────▼──┐  ┌────▼──────────────┐
          │  Supabase    │  │  Gemini 2.0 Flash  │
          │  PostgreSQL  │  │  (Google AI)       │
          │  (日記保存)   │  └────────────────────┘
          └─────────────┘
                │
          ┌─────▼──────┐
          │  Supabase   │
          │  Auth       │
          └────────────┘
```

## データモデル（Supabase / PostgreSQL）

### users
| カラム | 型 | 備考 |
|-------|-----|------|
| id | UUID | PK（Supabase Auth の user id と同一）|
| created_at | TIMESTAMP | |

### journal_entries
| カラム | 型 | 備考 |
|-------|-----|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| date | DATE | 日記の日付 |
| conversation | JSONB | 会話ログ全文 |
| summary | TEXT | AIが生成した振り返り文 |
| emotion_scores | JSONB | 例: {"穏やか": 70, "不安": 30} |
| created_at | TIMESTAMP | |

## 会話フロー

```
1. マイクボタン長押し → expo-av で録音
2. 録音終了 → STT（expo-speech 端末内蔵、精度不足なら Whisper API へ切替）でテキスト化
3. テキスト + 会話履歴 → /api/chat → Gemini API
4. Gemini の返答テキスト → expo-speech で音声再生 + 画面表示
5. 3〜5ターン繰り返す
6. 「終了」ボタン → /api/summary → Gemini で感情サマリー生成
7. Supabase に保存 → サマリー画面へ遷移
```

## 画面構成

| 画面 | 内容 |
|------|------|
| ホーム | 過去の日記一覧（日付・感情スコア・一言サマリー） |
| 会話 | チャットバブル + 録音ボタン + 「終了して保存」 |
| サマリー | 感情スコア・振り返り文・ホームへ戻るボタン |

## STT 方針

- まず `expo-speech`（端末内蔵・無料）で実装
- 精度が不十分な場合は OpenAI Whisper API に切り替え
