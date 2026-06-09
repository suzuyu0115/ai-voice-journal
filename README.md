# ai-voice-journal

AIと音声で会話しながら内省を深める日記アプリ。

## コンセプト

ボタンをタップして話しかけると、AIが音声で返答。2〜3ターンの自然な会話が、そのまま日記になる。

## ターゲットユーザー

- 日記を書きたいが書くのが面倒な人
- 文字入力が億劫でアプリが続かない人
- 全年齢・男女問わず（スマートフォン利用者）

## 価値提案

- 3分以内で完結
- 音声入力メイン（テキスト入力も可）
- AIが深掘り質問して自然に内省を引き出す
- リアルタイム文字起こしで認識確認できる

---

## 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| モバイル | React Native + Expo 56 (TypeScript) | Expo dev build 必須 |
| STT（リアルタイム文字起こし） | `expo-speech-recognition` | iOS ネイティブ Speech framework |
| AI 会話 | Gemini API `gemini-2.5-flash` | テキスト入力のみ |
| TTS（AI 音声出力） | `expo-speech` | |
| 状態管理 | Zustand | |
| DB / Auth | Supabase | |
| ナビゲーション | expo-router | |

---

## 会話フロー

```
マイクボタンをタップ
  → expo-speech-recognition でリアルタイム文字起こし開始
もう一度タップ
  → 文字起こし結果がテキスト入力欄に入る
  → 内容を確認して「送信」
  → Gemini API にテキスト送信
  → AI 応答テキストを expo-speech で音声再生
2〜3 ターン繰り返す
  → 「まとめる」ボタンでサマリー生成
  → Supabase に保存
```

---

## 画面構成

| 画面 | 内容 |
|------|------|
| ホーム | 過去の日記一覧（日付・感情スコア・振り返り文冒頭）、ストリーク表示 |
| 会話 | ボタンタップで音声入力、リアルタイム文字起こし表示、AI が音声で返答 |
| サマリー | 感情スコア + AI 生成の振り返り文、保存 |

---

## セットアップ

### 必要なもの

- macOS + Xcode（実機ビルドに必須）
- Node.js 18 以上
- Apple ID（無料の個人開発者アカウントで OK）
- iOS デバイス（音声認識は Simulator 非対応）

### 初回セットアップ

```bash
cd mobile
cp .env.example .env   # APIキーを記入（下記参照）
npm install
npx expo prebuild --platform ios --clean
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

- [ ] ボタンタップ STT（リアルタイム文字起こし表示）
- [ ] Gemini API 連携（テキスト会話、最大 2〜3 ターン）
- [ ] AI 応答の TTS 再生（expo-speech）
- [ ] 「まとめる」ボタンでいつでも会話終了
- [ ] 日記サマリー自動生成
- [ ] 感情スコア生成
- [ ] Supabase への保存
- [ ] 日記一覧表示
- [ ] ストリーク（連続記録日数）表示

### V2 以降

- オンボーディング画面
- リマインダー通知（時間設定）
- AI トーン設定（フレンドリー / 落ち着いた / ポジティブ）
- 日記文体設定（タメ口 / 敬語）
- ダークモード
- データエクスポート
- AI ラリー数の増加（有料オプション）

---

## データモデル

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | uuid | Supabase 自動生成 |
| created_at | timestamp | |
| conversation_log | JSON | AI とのやり取り全文 |
| diary_text | string | AI 生成サマリー |
| emotion_score | object | ラベル＋スコア |
| tags | string[] | |

---

## マネタイズ

- 月額 / 年額サブスク（フリーミアム）
- 無料枠：基本機能
- 有料枠（V2）：データエクスポート、AI ラリー数増加など
- 広告なし

---

## ディレクトリ構成

```
ai-voice-journal/
├── mobile/
│   ├── app/
│   │   ├── index.tsx              # ホーム画面
│   │   ├── conversation.tsx       # 会話画面
│   │   └── summary/[id].tsx       # サマリー画面
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts  # STT フック
│   │   │   └── useJournalChat.ts    # Gemini API + 会話管理
│   │   ├── lib/
│   │   │   ├── gemini.ts            # Gemini API クライアント
│   │   │   └── supabase.ts          # Supabase クライアント
│   │   ├── store/
│   │   │   └── journalStore.ts      # Zustand
│   │   └── components/
│   │       ├── RecordButton.tsx
│   │       └── ChatBubble.tsx
│   └── .env                         # 環境変数（Git 管理外）
└── api/                             # バックエンド（MVP では不使用）
```

---

## GitHub

- リポジトリ: https://github.com/suzuyu0115/ai-voice-journal
- Project（カンバン）: https://github.com/users/suzuyu0115/projects/6
- Issues: https://github.com/suzuyu0115/ai-voice-journal/issues
