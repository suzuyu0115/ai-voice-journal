import React from 'react';
import { create, act } from 'react-test-renderer';
import { useSummary } from '../useSummary';
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
  act(() => { useJournalStore.setState({ pendingMessages: [], messages: [], entries: [] }); });
});

afterEach(() => {
  if (currentRenderer) {
    act(() => { currentRenderer!.unmount(); });
    currentRenderer = null;
  }
});

describe('useSummary', () => {
  it('pendingMessages が空の場合、isGenerating は false で始まる', () => {
    const { result } = renderSummaryHook();
    expect(result.current.isGenerating).toBe(false);
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it('pendingMessages がある場合、マウント時に generateSummary を呼ぶ', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ summary: 'テスト要約', emotionScore: 7 });

    const { result } = renderSummaryHook();
    await act(async () => {});

    expect(mockGenerateSummary).toHaveBeenCalledWith(pendingMessages);
    expect(result.current.isGenerating).toBe(false);
  });

  it('generateSummary の結果が summary と emotionScore に反映される', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ summary: 'テスト要約', emotionScore: 8 });

    const { result } = renderSummaryHook();
    await act(async () => {});

    expect(result.current.summary).toBe('テスト要約');
    expect(result.current.emotionScore).toBe(8);
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
    mockGenerateSummary.mockResolvedValue({ summary: 'テスト要約', emotionScore: 7 });
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
    mockGenerateSummary.mockResolvedValue({ summary: 'テスト要約', emotionScore: 7 });
    mockInsertDiaryEntry.mockResolvedValue({ id: 'abc123', created_at: '2026-06-09T00:00:00Z' });

    const { result } = renderSummaryHook();
    await act(async () => {});
    await act(async () => { await result.current.saveEntry(); });

    const { entries } = useJournalStore.getState();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 'abc123', summary: 'テスト要約', emotionScore: 7 });
  });

  it('saveEntry がエラーを返した場合、null を返し error に格納される', async () => {
    useJournalStore.setState({ pendingMessages });
    mockGenerateSummary.mockResolvedValue({ summary: 'テスト要約', emotionScore: 7 });
    mockInsertDiaryEntry.mockRejectedValue(new Error('DB error'));

    const { result } = renderSummaryHook();
    await act(async () => {});

    let id: string | null = 'initial';
    await act(async () => { id = await result.current.saveEntry(); });

    expect(id).toBeNull();
    expect(result.current.error).toBe('DB error');
  });
});
