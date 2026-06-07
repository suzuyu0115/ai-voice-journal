import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY! });

export type Message = { role: 'user' | 'model'; text: string };

const SYSTEM_PROMPT = `あなたは内省を深めるためのAI日記アシスタントです。
ユーザーが話した内容に対して、共感しながら内省を促す質問を1〜2文で返してください。
会話が2〜3ターン続いたら、自然に「まとめましょうか？」と提案してください。
日本語で回答してください。`;

export async function sendMessage(messages: Message[]): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: { systemInstruction: SYSTEM_PROMPT },
  });

  return response.text ?? '';
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
