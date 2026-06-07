import { sendMessage, generateSummary } from '../gemini';
import { GoogleGenAI } from '@google/genai';
import type { Message } from '../gemini';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: { generateContent: jest.fn() },
  })),
}));

const MockGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

function getMockGenerateContent(): jest.Mock {
  return MockGoogleGenAI.mock.results[0]?.value?.models?.generateContent as jest.Mock;
}

beforeEach(() => {
  getMockGenerateContent()?.mockReset();
});

describe('sendMessage', () => {
  it('メッセージを送信してAI応答テキストを返す', async () => {
    getMockGenerateContent().mockResolvedValue({ text: 'AI応答テキスト' });
    const messages: Message[] = [{ role: 'user', text: 'こんにちは' }];
    const result = await sendMessage(messages);
    expect(result).toBe('AI応答テキスト');
  });

  it('APIがnullを返した場合は空文字を返す', async () => {
    getMockGenerateContent().mockResolvedValue({ text: null });
    const result = await sendMessage([{ role: 'user', text: 'テスト' }]);
    expect(result).toBe('');
  });

  it('user/model ロールを正しくマッピングする', async () => {
    getMockGenerateContent().mockResolvedValue({ text: '応答' });
    const messages: Message[] = [
      { role: 'user', text: '質問' },
      { role: 'model', text: '回答' },
    ];
    await sendMessage(messages);
    const calledWith = getMockGenerateContent().mock.calls[0][0];
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
