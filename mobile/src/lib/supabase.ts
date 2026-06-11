import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiaryEntry = {
  id: string;
  created_at: string;
  conversation_log: { role: 'user' | 'assistant'; text: string }[];
  diary_text: string;
  emotion_score: { score: number } | null;
  tags: string[];
};

export type Database = {
  public: {
    Tables: {
      diary_entries: {
        Row: DiaryEntry;
        Insert: Omit<DiaryEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<DiaryEntry, 'id' | 'created_at'>>;
      };
    };
  };
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export async function insertDiaryEntry(
  entry: Omit<DiaryEntry, 'id' | 'created_at'>
): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('diary_entries')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data as DiaryEntry;
}
