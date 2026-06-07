import { useState, useCallback } from 'react';
import * as Speech from 'expo-speech';
import { sendMessage } from '../lib/gemini';
import type { Message } from '../lib/gemini';

type UseJournalChatReturn = {
  messages: Message[];
  isLoading: boolean;
  isError: boolean;
  sendUserMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
};

export function useJournalChat(): UseJournalChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const sendUserMessage = useCallback(async (text: string) => {
    const userMessage: Message = { role: 'user', text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setIsLoading(true);
    setIsError(false);

    try {
      const reply = await sendMessage(nextMessages);
      const aiMessage: Message = { role: 'model', text: reply };
      setMessages([...nextMessages, aiMessage]);
      Speech.speak(reply, { language: 'ja-JP' });
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsError(false);
    Speech.stop();
  }, []);

  return { messages, isLoading, isError, sendUserMessage, clearMessages };
}
