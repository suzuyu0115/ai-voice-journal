import { useState, useCallback } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

type UseVoiceRecorderReturn = {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
};

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setTranscript(text);
      setInterimTranscript('');
    } else {
      setInterimTranscript(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError(event.message ?? 'エラーが発生しました');
    setIsRecording(false);
  });

  const startRecording = useCallback(async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('マイク権限がありません');
      return;
    }
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    ExpoSpeechRecognitionModule.start({ lang: 'ja-JP', interimResults: true });
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isRecording, transcript, interimTranscript, error, startRecording, stopRecording };
}
