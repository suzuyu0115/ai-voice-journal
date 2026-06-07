import { useState, useCallback, useEffect, useRef } from 'react';
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

async function pickBestJapaneseFemaleVoice(): Promise<string | undefined> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const jaVoices = voices.filter(v => v.language.startsWith('ja'));

    // 優先順: Enhanced（premium）> compact > その他
    const priority = ['enhanced', 'premium'];
    for (const keyword of priority) {
      const match = jaVoices.find(v =>
        v.identifier.toLowerCase().includes(keyword) ||
        v.quality?.toLowerCase().includes(keyword)
      );
      if (match) return match.identifier;
    }

    // Kyoko（女性）を優先
    const kyoko = jaVoices.find(v => v.identifier.toLowerCase().includes('kyoko'));
    if (kyoko) return kyoko.identifier;

    return jaVoices[0]?.identifier;
  } catch {
    return undefined;
  }
}

export function useJournalChat(): UseJournalChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const voiceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    pickBestJapaneseFemaleVoice().then(v => { voiceRef.current = v; });
  }, []);

  const speakReply = useCallback((text: string) => {
    Speech.stop();
    Speech.speak(text, {
      language: 'ja-JP',
      voice: voiceRef.current,
      rate: 0.45,
      pitch: 1.1,
    });
  }, []);

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
      speakReply(reply);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [messages, speakReply]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsError(false);
    Speech.stop();
  }, []);

  return { messages, isLoading, isError, sendUserMessage, clearMessages };
}
