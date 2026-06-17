import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY! });

export type Message = { role: 'user' | 'model'; text: string };

export async function generateSummary(messages: Message[]): Promise<{ title: string; body: string }> {
  const conversation = messages.map((m) => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `以下の会話をもとに日記を作成し、JSONで返してください。
フォーマット: {"title": "日記のタイトル（20字以内）", "body": "日記の本文（400字以内、ユーザーの一人称視点で自然な文体で）"}

会話:
${conversation}`,
          },
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });

  const parsed = JSON.parse(response.text ?? '{}');
  return { title: parsed.title ?? '', body: parsed.body ?? '' };
}
