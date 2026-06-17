import { generateSummary } from '../gemini';
import { GoogleGenAI } from '@google/genai';
import type { Message } from '../gemini';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContent: jest.fn(),
    },
  })),
}));

const MockGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

function getMockGenerateContent(): jest.Mock {
  return MockGoogleGenAI.mock.results[0]?.value?.models?.generateContent as jest.Mock;
}

beforeEach(() => {
  getMockGenerateContent()?.mockReset();
});

describe('generateSummary', () => {
  it('タイトルと本文を返す', async () => {
    getMockGenerateContent().mockResolvedValue({
      text: JSON.stringify({ title: '充実した一日', body: '今日は楽しかった。' }),
    });
    const messages: Message[] = [{ role: 'user', text: '今日は楽しかった' }];
    const result = await generateSummary(messages);
    expect(result.title).toBe('充実した一日');
    expect(result.body).toBe('今日は楽しかった。');
  });

  it('不正なJSONの場合はデフォルト値を返す', async () => {
    getMockGenerateContent().mockResolvedValue({ text: '{}' });
    const result = await generateSummary([{ role: 'user', text: 'テスト' }]);
    expect(result.title).toBe('');
    expect(result.body).toBe('');
  });
});
