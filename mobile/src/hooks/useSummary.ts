import { useState, useEffect, useCallback } from 'react';
import { generateSummary } from '../lib/gemini';
import { insertDiaryEntry } from '../lib/supabase';
import { useJournalStore } from '../store/journalStore';

type UseSummaryReturn = {
  title: string;
  body: string;
  setTitle: (title: string) => void;
  setBody: (body: string) => void;
  isGenerating: boolean;
  isSaving: boolean;
  error: string | null;
  saveEntry: () => Promise<string | null>;
  retry: () => void;
};

export function useSummary(): UseSummaryReturn {
  const { pendingMessages, addEntry, clearPendingMessages } = useJournalStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(() => pendingMessages.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial generation: setState only in callbacks, not synchronously in effect body
  useEffect(() => {
    if (!pendingMessages.length) return;
    generateSummary(pendingMessages)
      .then(({ title: t, body: b }) => {
        setTitle(t);
        setBody(b);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setIsGenerating(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = useCallback(() => {
    setIsGenerating(true);
    setError(null);
    generateSummary(pendingMessages)
      .then(({ title: t, body: b }) => {
        setTitle(t);
        setBody(b);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setIsGenerating(false));
  }, [pendingMessages]);

  const saveEntry = async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const data = await insertDiaryEntry({
        title,
        conversation_log: pendingMessages.map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          text: m.text,
        })),
        diary_text: body,
        tags: [],
      });

      addEntry({
        id: data.id,
        title,
        body,
        createdAt: data.created_at,
      });
      clearPendingMessages();

      return data.id;
    } catch (e) {
      setError(friendlyError(e));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return { title, body, setTitle, setBody, isGenerating, isSaving, error, saveEntry, retry };
}

export function friendlyError(e: unknown): string {
  let raw: string;
  if (e instanceof Error) {
    raw = e.message;
  } else if (e !== null && typeof e === 'object' && typeof (e as Record<string, unknown>).message === 'string') {
    raw = (e as { message: string }).message;
  } else {
    raw = String(e);
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.code === 503) {
      return 'AIサーバーが混み合っています。しばらく待ってから再試行してください。';
    }
    if (typeof parsed?.error?.message === 'string') {
      return parsed.error.message;
    }
  } catch {
    // not JSON, return as-is
  }
  return raw;
}
