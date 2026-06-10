import { useState, useEffect } from 'react';
import { generateSummary } from '../lib/gemini';
import { insertDiaryEntry } from '../lib/supabase';
import { useJournalStore } from '../store/journalStore';

type UseSummaryReturn = {
  summary: string;
  emotionScore: number;
  isGenerating: boolean;
  isSaving: boolean;
  error: string | null;
  saveEntry: () => Promise<string | null>;
};

export function useSummary(): UseSummaryReturn {
  const { pendingMessages, addEntry } = useJournalStore();
  const [summary, setSummary] = useState('');
  const [emotionScore, setEmotionScore] = useState(5);
  const [isGenerating, setIsGenerating] = useState(() => pendingMessages.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingMessages.length) return;
    generateSummary(pendingMessages)
      .then(({ summary: s, emotionScore: e }) => {
        setSummary(s);
        setEmotionScore(e);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsGenerating(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const saveEntry = async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const data = await insertDiaryEntry({
        conversation_log: pendingMessages.map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          text: m.text,
        })),
        diary_text: summary,
        emotion_score: { score: emotionScore },
        tags: [],
      });

      addEntry({
        id: data.id,
        summary,
        emotionScore,
        createdAt: data.created_at,
      });

      return data.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return { summary, emotionScore, isGenerating, isSaving, error, saveEntry };
}
