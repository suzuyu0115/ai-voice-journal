import React from 'react';
import { create, act } from 'react-test-renderer';
import { useCalendarEntries } from '../useCalendarEntries';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;

function makeQuery(resolveValue: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(resolveValue),
  };
  return query;
}

type HookResult = ReturnType<typeof useCalendarEntries>;

function renderHook(month: string) {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useCalendarEntries(month);
    return null;
  }
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(TestComponent)); });
  return { result: ref, renderer: renderer! };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCalendarEntries', () => {
  it('初期状態では loading が true で entriesByDate は空', () => {
    mockFrom.mockReturnValue(makeQuery({ data: [], error: null }));
    const { result } = renderHook('2026-06');
    expect(result.current.loading).toBe(true);
    expect(result.current.entriesByDate).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('データ取得後に日付でグループ化される', async () => {
    const entries = [
      { id: '1', created_at: '2026-06-05T10:00:00Z', diary_text: '日記1' },
      { id: '2', created_at: '2026-06-05T18:00:00Z', diary_text: '日記2' },
      { id: '3', created_at: '2026-06-09T09:00:00Z', diary_text: '日記3' },
    ];
    mockFrom.mockReturnValue(makeQuery({ data: entries, error: null }));
    const { result } = renderHook('2026-06');
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.entriesByDate['2026-06-05']).toHaveLength(2);
    expect(result.current.entriesByDate['2026-06-09']).toHaveLength(1);
  });

  it('Supabase エラー時に error がセットされる', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: null, error: { message: 'DB error' } }));
    const { result } = renderHook('2026-06');
    await act(async () => {});
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('DB error');
    expect(result.current.loading).toBe(false);
  });

  it('データが空の場合は entriesByDate が空のまま', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: [], error: null }));
    const { result } = renderHook('2026-06');
    await act(async () => {});
    expect(result.current.entriesByDate).toEqual({});
    expect(result.current.loading).toBe(false);
  });
});
