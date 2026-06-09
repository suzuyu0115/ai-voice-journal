import { useState, useCallback } from 'react';
import * as Speech from 'expo-speech';
import { sendMessageStream } from '../lib/gemini';
import type { Message } from '../lib/gemini';

export const MAX_RALLIES = 3;
const END_MARKER = '[END]';
export const INITIAL_MESSAGE = 'こんにちは！今日はどんなことがありましたか？';
export const CLOSING_MESSAGE = '以上でまとめます。ありがとうございました。';

type UseJournalChatReturn = {
  messages: Message[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isConversationComplete: boolean;
  sendUserMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
};

export function useJournalChat(): UseJournalChatReturn {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: INITIAL_MESSAGE },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConversationComplete, setIsConversationComplete] = useState(false);

  const speak = useCallback((text: string, onDone?: () => void) => {
    Speech.stop();
    Speech.speak(text, { language: 'ja-JP', volume: 1.0, onDone });
  }, []);

  const sendUserMessage = useCallback(async (text: string) => {
    const userMessage: Message = { role: 'user', text };
    const nextMessages = [...messages, userMessage];

    setMessages([...nextMessages, { role: 'model', text: '' }]);
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    try {
      let accumulated = '';
      const currentRallies = messages.filter(m => m.role === 'user').length;
      const isLastRally = currentRallies + 1 >= MAX_RALLIES;

      for await (const chunk of sendMessageStream(nextMessages, isLastRally)) {
        accumulated += chunk;
        const displayText = accumulated.replace(END_MARKER, '').trimEnd();
        setMessages([...nextMessages, { role: 'model', text: displayText }]);
      }

      const hasEndMarker = accumulated.includes(END_MARKER);
      const cleanText = accumulated.replace(END_MARKER, '').trim();
      const finalMessages = [...nextMessages, { role: 'model', text: cleanText }];
      const rallyCount = finalMessages.filter(m => m.role === 'user').length;

      if (hasEndMarker) {
        // AI が自然に締めくくった → そのまま読み上げて遷移
        setMessages(finalMessages);
        speak(cleanText, () => setIsConversationComplete(true));
      } else if (rallyCount >= MAX_RALLIES) {
        // 上限到達で AI が [END] を付けなかった → そのまま読み上げて遷移
        setMessages(finalMessages);
        speak(cleanText, () => setIsConversationComplete(true));
      } else {
        setMessages(finalMessages);
        speak(cleanText);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useJournalChat] sendMessage failed:', msg);
      setIsError(true);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, speak]);

  const clearMessages = useCallback(() => {
    setMessages([{ role: 'model', text: INITIAL_MESSAGE }]);
    setIsError(false);
    setErrorMessage(null);
    setIsConversationComplete(false);
    Speech.stop();
  }, []);

  return { messages, isLoading, isError, errorMessage, isConversationComplete, sendUserMessage, clearMessages };
}
