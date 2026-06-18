import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CalendarEntry = {
  id: string;
  created_at: string;
  diary_text: string;
};

type EntriesByDate = Record<string, CalendarEntry[]>;

// アプリセッション中にフェッチ済みの月データを保持するキャッシュ
const entriesCache = new Map<string, EntriesByDate>();

export function _clearEntriesCache() {
  entriesCache.clear();
}

export function useCalendarEntries(month: string) {
  const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>(
    () => entriesCache.get(month) ?? {}
  );
  const [loading, setLoading] = useState(() => !entriesCache.has(month));
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    entriesCache.delete(month);
    setRefreshKey((k) => k + 1);
  }, [month]);

  useEffect(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1).toISOString();
    const endDate = new Date(year, monthNum, 0, 23, 59, 59).toISOString();

    let cancelled = false;

    async function fetchEntries() {
      const cached = entriesCache.get(month);
      if (cached) {
        if (!cancelled) {
          setEntriesByDate(cached);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const { data, error: sbError } = await supabase
        .from('diary_entries')
        .select('id, created_at, diary_text')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (sbError) {
        setError(new Error(sbError.message));
      } else {
        const grouped: EntriesByDate = {};
        const rows = (data ?? []) as CalendarEntry[];
        for (const entry of rows) {
          const dateKey = entry.created_at.slice(0, 10);
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(entry);
        }
        entriesCache.set(month, grouped);
        setEntriesByDate(grouped);
      }
      setLoading(false);
    }

    fetchEntries();
    return () => {
      cancelled = true;
    };
  }, [month, refreshKey]);

  return { entriesByDate, loading, error, refetch };
}
