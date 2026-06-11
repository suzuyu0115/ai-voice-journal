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
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setPendingMessages: (messages: Message[]) => void;
  addEntry: (entry: JournalEntry) => void;
};

export const useJournalStore = create<JournalStore>((set) => ({
  messages: [],
  pendingMessages: [],
  entries: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setPendingMessages: (messages) => set({ pendingMessages: messages }),
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
}));
