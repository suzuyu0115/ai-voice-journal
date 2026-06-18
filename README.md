# ai-voice-journal

AIと音声で会話しながら内省を深める日記アプリ。

## コンセプト

マイクボタンをタップして話しかけると、Gemini Live API がリアルタイムで聞き取り・応答。2〜3ターンの自然な音声会話が、そのまま日記になる。

## ターゲットユーザー

- 日記を書きたいが書くのが面倒な人
- 文字入力が億劫でアプリが続かない人
- 全年齢・男女問わず（スマートフォン利用者）

## 価値提案

- 3分以内で完結
- 音声だけで完結（STT・AI 応答・TTS すべてリアルタイム）
- AIが深掘り質問して自然に内省を引き出す
- Duolingo 風ストリークで継続モチベーションを維持

---

## 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| モバイル | React Native + Expo 56 (TypeScript) | Expo dev build 必須 |
| AI 会話・STT・TTS | Gemini Live API `gemini-2.5-flash-preview-native-audio` | リアルタイム双方向音声 WebSocket |
| 音声 I/O | `@speechmatics/expo-two-way-audio` | PCM ストリーミング |
| 状態管理 | Zustand | |
| DB / Auth | Supabase | 匿名認証 + RLS |
| ナビゲーション | expo-router | |
| カレンダー | `react-native-calendars` | |

---

## 会話フロー

```
マイクボタンをタップ
  → Gemini Live WebSocket 接続
  → リアルタイム音声入出力（STT・AI 応答・TTS が一体）
AI の発話と文字起こしがリアルタイムで画面に表示される
自動終了（3ターン後）or 「まとめる」ボタンでいつでも終了
  → サマリー画面へ遷移 → タイトル・本文を AI 生成 → Supabase に保存
```

---

## 画面構成

| 画面 | 内容 |
|------|------|
| ホーム | 日記一覧（ジャーナルスタイル）、Duolingo 風ストリークカード |
| 会話 | マイクボタン・ステータス表示・会話バブル、Gemini Live によるリアルタイム音声会話 |
| カレンダー | 月間カレンダー・記録日ハイライト・日記プレビュー・FAB で選択日に日記追加 |
| 設定 | バージョン表示・各種設定項目 UI |
| サマリー | AI 生成タイトル・本文・編集・保存（タブバーなしフルスクリーン） |

---

## セットアップ

### 必要なもの

- macOS + Xcode（実機ビルドに必須）
- Node.js 18 以上
- Apple ID（無料の個人開発者アカウントで OK）
- iOS デバイス（Gemini Live は Simulator 非対応）

### 初回セットアップ

```bash
cd mobile
cp .env.example .env   # APIキーを記入（下記参照）
npm install
npx expo run:ios --device
```

### 環境変数（mobile/.env）

```
EXPO_PUBLIC_GEMINI_API_KEY=your_key
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 実機への初回インストール手順

1. **iPhone のデベロッパーモードを有効化**
   - 設定 → プライバシーとセキュリティ → デベロッパーモード → ON → 再起動

2. **Xcode で署名設定**
   - `open mobile/ios/AIVoiceJournal.xcworkspace`
   - 左サイドバーの `AIVoiceJournal`（青アイコン）をクリック
   - `TARGETS → AIVoiceJournal → Signing & Capabilities`
   - Team に自分の Apple ID を設定（Xcode → Settings → Accounts で追加）

3. **ビルド & インストール**
   ```bash
   npx expo run:ios --device
   ```
   または Xcode の ▶ Run ボタンを押す

4. **証明書の信頼（初回のみ）**
   - iPhone の 設定 → 一般 → VPN とデバイス管理
   - `Apple Development: ...` をタップ → 「信頼する」

### 日常の開発フロー

```bash
# Metro サーバーを起動（コード変更が即リロードされる）
cd mobile
npx expo start
```

- JS/TS のコード変更はファイル保存で自動リロード（再ビルド不要）
- 新しいネイティブパッケージ追加時や `app.json` 変更時は再ビルドが必要：
  ```bash
  npx expo run:ios --device
  ```

---

## 機能一覧

### MVP（〜2026-06-19）

- [x] Gemini Live API によるリアルタイム双方向音声会話
- [x] 最大 3 ターンで自動終了 + 「まとめる」ボタンでいつでも終了
- [x] フッターナビゲーションバー（4タブ）
- [x] 日記サマリー自動生成（Gemini によるタイトル+本文生成・編集・Supabase 保存）
- [x] 日記の日付を編集（ヘッダー日付タップ → カレンダーモーダル）
- [x] 日記一覧表示（ジャーナルスタイル・セクション分け）
- [x] ストリーク（連続記録日数）Duolingo 風カード表示（色がステージで変化）
- [x] カレンダー画面（月間カレンダー・日記記録日ハイライト・プレビュー）
- [x] カレンダーから日記詳細を閲覧・編集・削除
- [x] カレンダーの選択日から日記作成（FAB ボタン）
- [x] 設定画面（バージョン表示・各種設定項目 UI）
- [x] 匿名認証（Supabase Anonymous Auth）によるユーザーデータ分離

### V2 以降

- オンボーディング画面
- リマインダー通知（時間設定）
- AI トーン設定（フレンドリー / 落ち着いた / ポジティブ）
- 日記文体設定（タメ口 / 敬語）
- ダークモード
- データエクスポート
- AI ラリー数の増加（有料オプション）

---

## データモデル（Supabase `diary_entries`）

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | uuid | 自動生成 |
| created_at | timestamptz | 日記の日付として使用（noon UTC） |
| title | text | AI 生成、最大 50 字 |
| conversation_log | jsonb | `[{ role, text }]` |
| diary_text | text | AI 生成本文 |
| tags | text[] | |

---

## ディレクトリ構成

```
ai-voice-journal/
├── mobile/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx          # ホーム（日記一覧 + ストリーク）
│   │   │   ├── conversation.tsx   # 会話（Gemini Live）
│   │   │   ├── calendar.tsx       # カレンダー
│   │   │   └── settings.tsx       # 設定
│   │   └── summary/[id].tsx       # サマリー（作成・表示モード）
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useGeminiLive.ts   # Gemini Live WebSocket 管理
│   │   │   ├── useAuth.ts         # Supabase 匿名認証
│   │   │   ├── useSummary.ts      # サマリー生成・保存
│   │   │   ├── useDiaryList.ts    # 日記一覧取得
│   │   │   ├── useDiaryEntry.ts   # 日記詳細取得・削除
│   │   │   └── useCalendarEntries.ts
│   │   ├── lib/
│   │   │   ├── gemini.ts          # generateSummary
│   │   │   └── supabase.ts        # DB ヘルパー
│   │   ├── store/
│   │   │   └── journalStore.ts    # Zustand（pendingMessages, targetDate）
│   │   └── components/
│   │       └── BottomTabBar.tsx
│   └── .env                       # 環境変数（Git 管理外）
└── api/                           # バックエンド（MVP では不使用）
```

---

## GitHub

- リポジトリ: https://github.com/suzuyu0115/ai-voice-journal
- Project（カンバン）: https://github.com/users/suzuyu0115/projects/6
- Issues: https://github.com/suzuyu0115/ai-voice-journal/issues
