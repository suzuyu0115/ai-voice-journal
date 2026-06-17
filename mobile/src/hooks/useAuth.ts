import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthState = {
  userId: string | null;
  loading: boolean;
  error: string | null;
};

export function useAuth(): AuthState {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        if (!cancelled) setUserId(session.user.id);
      } else {
        const { data, error: signInError } = await supabase.auth.signInAnonymously();
        if (cancelled) return;
        if (signInError) {
          setError(signInError.message);
        } else {
          setUserId(data.user?.id ?? null);
        }
      }

      if (!cancelled) setLoading(false);
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { userId, loading, error };
}
