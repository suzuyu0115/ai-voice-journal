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
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const MESSAGES: Message[] = [{ role: 'user', text: '今日は楽しかった' }];
const SUCCESS_RESPONSE = { text: JSON.stringify({ title: '充実した一日', body: '今日は楽しかった。' }) };
const make503 = () => new Error(JSON.stringify({ error: { code: 503, message: 'overloaded' } }));

describe('generateSummary', () => {
  it('タイトルと本文を返す', async () => {
    getMockGenerateContent().mockResolvedValue(SUCCESS_RESPONSE);
    const result = await generateSummary(MESSAGES);
    expect(result.title).toBe('充実した一日');
    expect(result.body).toBe('今日は楽しかった。');
  });

  it('不正なJSONの場合はデフォルト値を返す', async () => {
    getMockGenerateContent().mockResolvedValue({ text: '{}' });
    const result = await generateSummary([{ role: 'user', text: 'テスト' }]);
    expect(result.title).toBe('');
    expect(result.body).toBe('');
  });

  it('503エラー後にリトライして成功する', async () => {
    getMockGenerateContent()
      .mockRejectedValueOnce(make503())
      .mockResolvedValueOnce({ text: JSON.stringify({ title: 'リトライ成功', body: '本文' }) });

    const promise = generateSummary(MESSAGES);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.title).toBe('リトライ成功');
    expect(getMockGenerateContent()).toHaveBeenCalledTimes(2);
  });

  it('リトライ不可能なエラーは即座にスローする', async () => {
    getMockGenerateContent().mockRejectedValueOnce(new Error('invalid api key'));

    await expect(generateSummary(MESSAGES)).rejects.toThrow('invalid api key');
    expect(getMockGenerateContent()).toHaveBeenCalledTimes(1);
  });

  it('3回すべて503なら最後のエラーをスローする', async () => {
    getMockGenerateContent()
      .mockRejectedValueOnce(make503())
      .mockRejectedValueOnce(make503())
      .mockRejectedValueOnce(make503());

    // reject ハンドラを先に付けてから timers を進める
    const assertion = expect(generateSummary(MESSAGES)).rejects.toThrow();
    await jest.runAllTimersAsync();
    await assertion;

    expect(getMockGenerateContent()).toHaveBeenCalledTimes(3);
  });
});
