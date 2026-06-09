import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY! });

export type Message = { role: 'user' | 'model'; text: string };

const SYSTEM_PROMPT = `あなたは内省を深めるためのAI日記アシスタントです。
ユーザーが話した内容に対して、共感しながら内省を促す質問を1〜2文で返してください。
日本語で回答してください。

【重要】日記としてまとめられる内容が十分に揃ったと判断した場合、またはユーザーが会話を終わらせたそうな場合：
- 質問はせず、共感・感謝・励ましの締めくくり文を返す
- 返答の末尾に必ず「[END]」を付ける
- 例：「今日のことを話してくれてありがとう。少し気持ちが楽になれば嬉しいです。[END]」

[END] は必ず締めくくりの文にのみ付け、質問文には絶対に付けないでください。`;

const LAST_RALLY_SYSTEM_PROMPT = `あなたはAI日記アシスタントです。
これが会話の最後の返答です。日本語で回答してください。

【絶対ルール・例外なし】以下の構成で2〜3文で返答してください：
1. ユーザーの話への受けごたえ（共感・承認）を1文で
2. 感謝・励まし・前向きな言葉で締めくくりを1〜2文で
3. 返答の末尾に必ず [END] を付ける
4. 質問は一切書いてはいけません（「？」で終わる文は禁止）

例：「プロンプト作成に苦労しながらも粘り強く取り組んだのですね。その経験はきっと力になります。今日のことを話してくれてありがとう。[END]」`;

export async function* sendMessageStream(
  messages: Message[],
  isLastRally = false
): AsyncGenerator<string> {
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const systemInstruction = isLastRally ? LAST_RALLY_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    config: { systemInstruction },
  });

  for await (const chunk of stream) {
    yield chunk.text ?? '';
  }
}

export async function generateSummary(messages: Message[]): Promise<{ summary: string; emotionScore: number }> {
  const conversation = messages.map((m) => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `以下の会話を日記としてまとめ、JSONで返してください。
フォーマット: {"summary": "日記の要約（200字以内）", "emotionScore": 感情スコア（1〜10の整数、10が最もポジティブ）}

会話:
${conversation}`,
          },
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });

  const parsed = JSON.parse(response.text ?? '{}');
  return { summary: parsed.summary ?? '', emotionScore: parsed.emotionScore ?? 5 };
}
