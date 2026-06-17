import React from 'react';
import { create, act } from 'react-test-renderer';
import { useDiaryEntry } from '../useDiaryEntry';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

const mockEntry = {
  id: 'abc123',
  created_at: '2026-06-17T12:00:00Z',
  title: 'テストタイトル',
  diary_text: 'テスト本文',
  conversation_log: [],
  tags: [],
};

function makeQuery(resolveValue: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolveValue),
  };
}

type HookResult = ReturnType<typeof useDiaryEntry>;

function renderHook(id: string | null) {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useDiaryEntry(id);
    return null;
  }
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(TestComponent)); });
  return { result: ref, renderer: renderer! };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useDiaryEntry', () => {
  it('id が null のときはフェッチをスキップする', () => {
    const { result } = renderHook(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.entry).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('フェッチ中は loading が true になる', () => {
    mockFrom.mockReturnValue(makeQuery({ data: mockEntry, error: null }));
    const { result } = renderHook('abc123');
    expect(result.current.loading).toBe(true);
  });

  it('取得完了後は loading が false になり entry がセットされる', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: mockEntry, error: null }));
    const { result } = renderHook('abc123');
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.entry).toMatchObject({ id: 'abc123', title: 'テストタイトル' });
  });

  it('Supabase エラー時は error にセットされる', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: null, error: { message: 'Not found' } }));
    const { result } = renderHook('abc123');
    await act(async () => {});
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Not found');
    expect(result.current.loading).toBe(false);
  });

  it('id が変わったときに再フェッチする', async () => {
    const query = makeQuery({ data: mockEntry, error: null });
    mockFrom.mockReturnValue(query);
    const ref = { current: undefined as unknown as HookResult };
    let currentId = 'id-1';
    function TestComponent() {
      ref.current = useDiaryEntry(currentId);
      return null;
    }
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(React.createElement(TestComponent)); });
    await act(async () => {});
    const callsBefore = (query.single as jest.Mock).mock.calls.length;
    currentId = 'id-2';
    act(() => { renderer.update(React.createElement(TestComponent)); });
    await act(async () => {});
    expect((query.single as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('refetch を呼ぶと再フェッチされる', async () => {
    const query = makeQuery({ data: mockEntry, error: null });
    mockFrom.mockReturnValue(query);
    const { result } = renderHook('abc123');
    await act(async () => {});
    const callsBefore = (query.single as jest.Mock).mock.calls.length;
    await act(async () => { result.current.refetch(); });
    await act(async () => {});
    expect((query.single as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
