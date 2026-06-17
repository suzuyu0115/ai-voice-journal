import React from 'react';
import { create, act } from 'react-test-renderer';
import { useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockSignIn = supabase.auth.signInAnonymously as jest.Mock;

type HookResult = ReturnType<typeof useAuth>;

function renderHookAuth() {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useAuth();
    return null;
  }
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(TestComponent)); });
  return { result: ref, renderer: renderer! };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAuth', () => {
  it('初期状態では loading が true', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHookAuth();
    expect(result.current.loading).toBe(true);
  });

  it('セッションがない場合、signInAnonymously を呼ぶ', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignIn.mockResolvedValue({ data: { user: { id: 'anon-id' } }, error: null });

    const { result } = renderHookAuth();
    await act(async () => {});

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('既存セッションがある場合、signInAnonymously を呼ばない', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'existing-id' } } } });

    const { result } = renderHookAuth();
    await act(async () => {});

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('認証完了後、userId が返る', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignIn.mockResolvedValue({ data: { user: { id: 'anon-id' } }, error: null });

    const { result } = renderHookAuth();
    await act(async () => {});

    expect(result.current.userId).toBe('anon-id');
  });

  it('signInAnonymously がエラーを返した場合、error がセットされる', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: '認証に失敗しました' } });

    const { result } = renderHookAuth();
    await act(async () => {});

    expect(result.current.error).toBe('認証に失敗しました');
  });
});
