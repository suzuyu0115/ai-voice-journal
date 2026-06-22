import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY! });

export type Message = { role: 'user' | 'model'; text: string };

const SUMMARY_MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function isRetryable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  try {
    const parsed = JSON.parse(msg);
    const code = parsed?.error?.code;
    // 503: overloaded, 429: rate limit, 500: internal error
    return code === 503 || code === 429 || code === 500;
  } catch {
    return msg.includes('503') || msg.includes('429') || msg.includes('overloaded');
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateSummary(messages: Message[]): Promise<{ title: string; body: string }> {
  const conversation = messages.map((m) => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.text}`).join('\n');

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
    try {
      const response = await ai.models.generateContent({
        model: SUMMARY_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `以下の会話をもとに日記を作成し、JSONで返してください。
フォーマット: {"title": "日記のタイトル（20字以内）", "body": "日記の本文（400字以内、ユーザーの一人称視点で自然な文体で、内容の区切りには\\nを入れて読みやすく段落を分けること）"}

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
    } catch (e) {
      lastError = e;
      if (!isRetryable(e) || attempt === MAX_RETRIES - 1) break;
    }
  }
  throw lastError;
}
