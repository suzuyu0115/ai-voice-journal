import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiaryEntry = {
  id: string;
  created_at: string;
  conversation_log: { role: 'user' | 'assistant'; text: string }[];
  diary_text: string;
  emotion_score: { positive: number; negative: number; neutral: number } | null;
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

export const supabase = createClient<Database>(
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
