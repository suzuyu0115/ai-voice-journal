import { sendMessageStream, generateSummary } from '../gemini';
import { GoogleGenAI } from '@google/genai';
import type { Message } from '../gemini';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContentStream: jest.fn(),
      generateContent: jest.fn(),
    },
  })),
}));

const MockGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

function getMockGenerateContentStream(): jest.Mock {
  return MockGoogleGenAI.mock.results[0]?.value?.models?.generateContentStream as jest.Mock;
}

function getMockGenerateContent(): jest.Mock {
  return MockGoogleGenAI.mock.results[0]?.value?.models?.generateContent as jest.Mock;
}

async function* makeAsyncStream(...chunks: { text: string }[]) {
  for (const chunk of chunks) yield chunk;
}

beforeEach(() => {
  getMockGenerateContentStream()?.mockReset();
  getMockGenerateContent()?.mockReset();
});

describe('sendMessageStream', () => {
  it('ストリームからテキストチャンクを yield する', async () => {
    getMockGenerateContentStream().mockResolvedValue(
      makeAsyncStream({ text: 'こんにちは' }, { text: '！' })
    );
    const messages: Message[] = [{ role: 'user', text: 'テスト' }];
    const chunks: string[] = [];
    for await (const chunk of sendMessageStream(messages)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['こんにちは', '！']);
  });

  it('chunk.text が null/undefined の場合は空文字を yield する', async () => {
    getMockGenerateContentStream().mockResolvedValue(
      makeAsyncStream({ text: null as unknown as string })
    );
    const chunks: string[] = [];
    for await (const chunk of sendMessageStream([{ role: 'user', text: 'テスト' }])) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['']);
  });

  it('isLastRally=true のとき LAST_RALLY_SYSTEM_PROMPT を使う（呼び出し自体は成功する）', async () => {
    getMockGenerateContentStream().mockResolvedValue(makeAsyncStream({ text: '了解しました。[END]' }));
    const messages: Message[] = [{ role: 'user', text: '最後のメッセージ' }];
    const chunks: string[] = [];
    for await (const chunk of sendMessageStream(messages, true)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('了解しました。[END]');
    expect(getMockGenerateContentStream()).toHaveBeenCalledTimes(1);
  });

  it('user/model ロールを正しくマッピングする', async () => {
    getMockGenerateContentStream().mockResolvedValue(makeAsyncStream({ text: '応答' }));
    const messages: Message[] = [
      { role: 'user', text: '質問' },
      { role: 'model', text: '回答' },
    ];
    for await (const _ of sendMessageStream(messages)) { /* consume */ }
    const calledWith = getMockGenerateContentStream().mock.calls[0][0];
    expect(calledWith.contents[0].role).toBe('user');
    expect(calledWith.contents[1].role).toBe('model');
  });
});

describe('generateSummary', () => {
  it('要約と感情スコアを返す', async () => {
    getMockGenerateContent().mockResolvedValue({
      text: JSON.stringify({ summary: '今日はよい一日でした', emotionScore: 8 }),
    });
    const messages: Message[] = [{ role: 'user', text: '今日は楽しかった' }];
    const result = await generateSummary(messages);
    expect(result.summary).toBe('今日はよい一日でした');
    expect(result.emotionScore).toBe(8);
  });

  it('不正なJSONの場合はデフォルト値を返す', async () => {
    getMockGenerateContent().mockResolvedValue({ text: '{}' });
    const result = await generateSummary([{ role: 'user', text: 'テスト' }]);
    expect(result.summary).toBe('');
    expect(result.emotionScore).toBe(5);
  });
});
