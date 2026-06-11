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
  const { pendingMessages, addEntry } = useJournalStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(() => pendingMessages.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!pendingMessages.length) return;
    setIsGenerating(true);
    setError(null);
    try {
      const { title: t, body: b } = await generateSummary(pendingMessages);
      setTitle(t);
      setBody(b);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setIsGenerating(false);
    }
  }, [pendingMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = useCallback(() => generate(), [generate]);

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

function friendlyError(e: unknown): string {
  // Supabase errors are plain objects with a message property, not Error instances
  const raw = e instanceof Error
    ? e.message
    : (e !== null && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string')
      ? (e as { message: string }).message
      : String(e);
  try {
    const parsed = JSON.parse(raw);
    const code = parsed?.error?.code;
    if (code === 503) return 'AIサーバーが混み合っています。しばらく待ってから再試行してください。';
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // not JSON
  }
  return raw;
}
