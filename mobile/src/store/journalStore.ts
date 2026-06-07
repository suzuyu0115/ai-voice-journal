import { create } from 'zustand';
import type { Message } from '../lib/gemini';

export type JournalEntry = {
  id: string;
  summary: string;
  emotionScore: number;
  createdAt: string;
};

type JournalStore = {
  messages: Message[];
  entries: JournalEntry[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  addEntry: (entry: JournalEntry) => void;
};

export const useJournalStore = create<JournalStore>((set) => ({
  messages: [],
  entries: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
}));
