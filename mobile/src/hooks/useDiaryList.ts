import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type DiaryListEntry = {
  id: string;
  created_at: string;
  title: string;
  diary_text: string;
};

export function useDiaryList() {
  const [entries, setEntries] = useState<DiaryListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchEntries() {
      setLoading(true);
      setError(null);
      const { data, error: sbError } = await supabase
        .from('diary_entries')
        .select('id, created_at, title, diary_text')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (sbError) {
        setError(new Error(sbError.message));
      } else {
        setEntries((data ?? []) as DiaryListEntry[]);
      }
      setLoading(false);
    }

    fetchEntries();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { entries, loading, error, refetch };
}
