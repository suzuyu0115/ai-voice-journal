import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CalendarEntry = {
  id: string;
  created_at: string;
  diary_text: string;
};

type EntriesByDate = Record<string, CalendarEntry[]>;

export function useCalendarEntries(month: string) {
  const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1).toISOString();
    const endDate = new Date(year, monthNum, 0, 23, 59, 59).toISOString();

    let cancelled = false;

    async function fetchEntries() {
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
        setEntriesByDate(grouped);
      }
      setLoading(false);
    }

    fetchEntries();
    return () => {
      cancelled = true;
    };
  }, [month]);

  return { entriesByDate, loading, error };
}
