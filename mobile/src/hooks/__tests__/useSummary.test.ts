import React from 'react';
import { create, act } from 'react-test-renderer';
import { useSummary, friendlyError } from '../useSummary';
import { generateSummary } from '../../lib/gemini';
import { insertDiaryEntry } from '../../lib/supabase';
import { useJournalStore } from '../../store/journalStore';

jest.mock('../../lib/gemini', () => ({
  generateSummary: jest.fn(),
}));

jest.mock('../../lib/supabase', () => ({
  insertDiaryEntry: jest.fn(),
}));

const mockGenerateSummary = generateSummary as jest.Mock;
const mockInsertDiaryEntry = insertDiaryEntry as jest.Mock;

const pendingMessages = [
  { role: 'model' as const, text: 'こんにちは！今日はどんなことがありましたか？' },
  { role: 'user' as const, text: '今日は仕事が大変でした' },
];

type HookResult = ReturnType<typeof useSummary>;

let currentRenderer: ReturnType<typeof create> | null = null;

function renderSummaryHook() {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useSummary();
    return null;
  }
  act(() => { currentRenderer = create(React.createElement(TestComponent)); });
  return { result: ref };
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => { useJournalStore.setState({ pendingMessages: [], messages: [], entries: [], targetDate: null }); });
});

afterEach(() => {
  if (currentRenderer) {
    act(() => { currentRenderer!.unmount(); });
    currentRenderer = null;
  }
});

describe('useSummary', () => {
  it('entryDate のデフォルトは今日の日付', () => {
    const today = new Date().toISOString().slice(0, 10);
    const { result } = renderSummaryHook();
    expect(result.current.entryDate).toBe(today);
  });

  it('targetDate がある場合、entryDate の初期値は targetDate になる', () => {
    act(() => { useJournalStore.setState({ targetDate: '2026-06-15' }); });
    const { result } = renderSummaryHook();
    expect(result.current.entryDate).toBe('2026-06-15');
  });

  it('setEntryDate で日付が変更される', () => {
    const { result } = renderSummaryHook();
    act(() => { result.current.setEntryDate('2026-06-16'); });
    expect(result.current.entryDate).toBe('2026-06-16');
  });

  it('saveEntry が insertDiaryEntry を created_at 付きで呼ぶ', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ title: 'テストタイトル', body: 'テスト本文' });
    mockInsertDiaryEntry.mockResolvedValue({ id: 'abc123', created_at: '2026-06-18T12:00:00Z' });

    const { result } = renderSummaryHook();
    await act(async () => {});
    await act(async () => { await result.current.saveEntry(); });

    expect(mockInsertDiaryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ created_at: expect.stringMatching(/T12:00:00\.000Z$/) })
    );
  });

  it('saveEntry 後に clearPendingMessages が呼ばれ targetDate も null になる', async () => {
    act(() => { useJournalStore.setState({ pendingMessages, targetDate: '2026-06-15' }); });
    mockGenerateSummary.mockResolvedValue({ title: 'テストタイトル', body: 'テスト本文' });
    mockInsertDiaryEntry.mockResolvedValue({ id: 'abc123', created_at: '2026-06-15T12:00:00Z' });

    const { result } = renderSummaryHook();
    await act(async () => {});
    await act(async () => { await result.current.saveEntry(); });

    expect(useJournalStore.getState().targetDate).toBeNull();
    expect(useJournalStore.getState().pendingMessages).toHaveLength(0);
  });

  it('pendingMessages が空の場合、isGenerating は false で始まる', () => {
    const { result } = renderSummaryHook();
    expect(result.current.isGenerating).toBe(false);
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it('pendingMessages がある場合、マウント時に generateSummary を呼ぶ', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ title: 'テストタイトル', body: 'テスト本文' });

    const { result } = renderSummaryHook();
    await act(async () => {});

    expect(mockGenerateSummary).toHaveBeenCalledWith(pendingMessages);
    expect(result.current.isGenerating).toBe(false);
  });

  it('generateSummary の結果が title と body に反映される', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ title: '充実した一日', body: '仕事が大変だったが乗り越えた。' });

    const { result } = renderSummaryHook();
    await act(async () => {});

    expect(result.current.title).toBe('充実した一日');
    expect(result.current.body).toBe('仕事が大変だったが乗り越えた。');
  });

  it('generateSummary がエラーを投げた場合、error に格納される', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockRejectedValue(new Error('API error'));

    const { result } = renderSummaryHook();
    await act(async () => {});

    expect(result.current.error).toBe('API error');
    expect(result.current.isGenerating).toBe(false);
  });

  it('saveEntry が insertDiaryEntry を呼び ID を返す', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ title: 'テストタイトル', body: 'テスト本文' });
    mockInsertDiaryEntry.mockResolvedValue({ id: 'abc123', created_at: '2026-06-09T00:00:00Z' });

    const { result } = renderSummaryHook();
    await act(async () => {});

    let id: string | null = null;
    await act(async () => { id = await result.current.saveEntry(); });

    expect(mockInsertDiaryEntry).toHaveBeenCalled();
    expect(id).toBe('abc123');
  });

  it('saveEntry 成功後、ストアの entries に追加される', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ title: 'テストタイトル', body: 'テスト本文' });
    mockInsertDiaryEntry.mockResolvedValue({ id: 'abc123', created_at: '2026-06-09T00:00:00Z' });

    const { result } = renderSummaryHook();
    await act(async () => {});
    await act(async () => { await result.current.saveEntry(); });

    const { entries } = useJournalStore.getState();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 'abc123', title: 'テストタイトル', body: 'テスト本文' });
  });

  it('retry を呼ぶと generateSummary が再度呼ばれ error がクリアされる', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockRejectedValueOnce(new Error('API error'));
    mockGenerateSummary.mockResolvedValue({ title: '再試行タイトル', body: '再試行本文' });

    const { result } = renderSummaryHook();
    await act(async () => {});
    expect(result.current.error).toBe('API error');

    await act(async () => { result.current.retry(); });
    await act(async () => {});

    expect(mockGenerateSummary).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.title).toBe('再試行タイトル');
  });

  it('503エラーの場合、日本語のメッセージに変換される', async () => {
    useJournalStore.setState({ pendingMessages });
    const err503 = new Error('{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}');
    mockGenerateSummary.mockRejectedValue(err503);

    const { result } = renderSummaryHook();
    await act(async () => {});

    expect(result.current.error).toBe('AIサーバーが混み合っています。しばらく待ってから再試行してください。');
  });

  it('saveEntry が plain object エラー（Supabase形式）を投げた場合、message を表示する', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ title: 'テストタイトル', body: 'テスト本文' });
    mockInsertDiaryEntry.mockRejectedValue({ message: 'row violates policy', code: '42501' });

    const { result } = renderSummaryHook();
    await act(async () => {});

    let id: string | null = 'initial';
    await act(async () => { id = await result.current.saveEntry(); });

    expect(id).toBeNull();
    expect(result.current.error).toBe('row violates policy');
  });

  it('saveEntry がエラーを返した場合、null を返し error に格納される', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ title: 'テストタイトル', body: 'テスト本文' });
    mockInsertDiaryEntry.mockRejectedValue(new Error('DB error'));

    const { result } = renderSummaryHook();
    await act(async () => {});

    let id: string | null = 'initial';
    await act(async () => { id = await result.current.saveEntry(); });

    expect(id).toBeNull();
    expect(result.current.error).toBe('DB error');
  });
});

describe('friendlyError', () => {
  it('Error インスタンスは message を返す', () => {
    expect(friendlyError(new Error('test'))).toBe('test');
  });

  it('plain object は message プロパティを返す', () => {
    expect(friendlyError({ message: 'supabase error' })).toBe('supabase error');
  });

  it('非オブジェクトは String() で変換する', () => {
    expect(friendlyError(42)).toBe('42');
    expect(friendlyError(null)).toBe('null');
  });

  it('JSON の error.message を返す（503以外）', () => {
    const raw = JSON.stringify({ error: { code: 400, message: 'Bad Request' } });
    expect(friendlyError(new Error(raw))).toBe('Bad Request');
  });

  it('503 エラーは日本語メッセージに変換する', () => {
    const raw = JSON.stringify({ error: { code: 503, message: 'unavailable' } });
    expect(friendlyError(new Error(raw))).toBe('AIサーバーが混み合っています。しばらく待ってから再試行してください。');
  });

  it('JSON でない文字列はそのまま返す', () => {
    expect(friendlyError(new Error('plain error'))).toBe('plain error');
  });
});
