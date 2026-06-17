import { create } from 'zustand';
import type { Message } from '../lib/gemini';

export type JournalEntry = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type JournalStore = {
  messages: Message[];
  pendingMessages: Message[];
  entries: JournalEntry[];
  targetDate: string | null;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setPendingMessages: (messages: Message[]) => void;
  clearPendingMessages: () => void;
  addEntry: (entry: JournalEntry) => void;
  setTargetDate: (date: string) => void;
};

export const useJournalStore = create<JournalStore>((set) => ({
  messages: [],
  pendingMessages: [],
  entries: [],
  targetDate: null,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setPendingMessages: (messages) => set({ pendingMessages: messages }),
  clearPendingMessages: () => set({ pendingMessages: [], targetDate: null }),
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  setTargetDate: (date) => set({ targetDate: date }),
}));
