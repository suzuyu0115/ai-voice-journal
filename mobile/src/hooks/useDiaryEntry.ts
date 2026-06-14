import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { DiaryEntry } from '../lib/supabase';

export function useDiaryEntry(id: string | null) {
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchEntry() {
      setLoading(true);
      const { data, error: sbError } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (sbError) {
        setError(new Error(sbError.message));
      } else {
        setEntry(data as DiaryEntry);
      }
      setLoading(false);
    }

    fetchEntry();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { entry, loading, error };
}
