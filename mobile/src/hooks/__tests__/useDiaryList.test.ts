import React from 'react';
import { create, act } from 'react-test-renderer';
import { useDiaryList } from '../useDiaryList';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;

function makeQuery(resolveValue: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(resolveValue),
  };
}

type HookResult = ReturnType<typeof useDiaryList>;

function renderHook() {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useDiaryList();
    return null;
  }
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(TestComponent)); });
  return { result: ref, renderer: renderer! };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useDiaryList', () => {
  it('初期状態では loading が true で entries は空', () => {
    mockFrom.mockReturnValue(makeQuery({ data: [], error: null }));
    const { result } = renderHook();
    expect(result.current.loading).toBe(true);
    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('データ取得後に entries が降順で返される', async () => {
    const data = [
      { id: '2', created_at: '2026-06-17T10:00:00Z', title: '昨日', diary_text: '本文2' },
      { id: '1', created_at: '2026-06-16T10:00:00Z', title: '一昨日', diary_text: '本文1' },
    ];
    mockFrom.mockReturnValue(makeQuery({ data, error: null }));
    const { result } = renderHook();
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0].id).toBe('2');
  });

  it('Supabase エラー時に error がセットされる', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: null, error: { message: 'DB error' } }));
    const { result } = renderHook();
    await act(async () => {});
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('DB error');
    expect(result.current.loading).toBe(false);
  });

  it('データが空の場合は entries が空のまま', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: [], error: null }));
    const { result } = renderHook();
    await act(async () => {});
    expect(result.current.entries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('data が null でエラーなしの場合は entries が空のまま', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: null, error: null }));
    const { result } = renderHook();
    await act(async () => {});
    expect(result.current.entries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('refetch を呼ぶとクエリが再実行される', async () => {
    const query = makeQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);
    const { result } = renderHook();
    await act(async () => {});
    const callsBefore = (query.order as jest.Mock).mock.calls.length;
    await act(async () => { result.current.refetch(); });
    await act(async () => {});
    expect((query.order as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
