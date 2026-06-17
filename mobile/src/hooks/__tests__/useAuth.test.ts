import { supabase } from '../../lib/supabase';
import { useAuth } from '../useAuth';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.todo('セッションがない場合、signInAnonymously を呼ぶ');

  it.todo('既存セッションがある場合、signInAnonymously を呼ばない');

  it.todo('認証完了後、userId が返る');

  it.todo('signInAnonymously がエラーを返した場合、error がセットされる');

  it.todo('初期状態では loading が true');
});
