import { useCallback, useRef, useState } from 'react';
import { GoogleGenAI, Modality, EndSensitivity } from '@google/genai/web';
import type { LiveServerMessage, Session } from '@google/genai/web';
import { Buffer } from 'buffer';
import {
  initialize as initializeAudio,
  playPCMData,
  toggleRecording,
  useExpoTwoWayAudioEventListener,
  useMicrophonePermissions,
} from '@speechmatics/expo-two-way-audio';
import type { Message } from '../lib/gemini';

export const MAX_RALLIES = 4;
export const INITIAL_MESSAGE = 'こんにちは！今日はどんな一日でしたか？出来事や感じたことを詳しく聞かせてください。';
const TRANSITION_SUFFIX = 'では、話してもらった内容をもとに日記を作成しますね。ありがとうございました。';

const MODEL = 'gemini-3.1-flash-live-preview';
const LIVE_OUTPUT_SAMPLE_RATE = 24000;
// expo-two-way-audio の再生は 16kHz 固定なので、受信した24kHzをダウンサンプルする
const PLAYBACK_SAMPLE_RATE = 16000;

const SYSTEM_INSTRUCTION = `あなたは内省を深めるためのAI日記アシスタントです。音声で会話しています。
ユーザーが話した内容に共感しながら、内省を促す質問を1文だけ短く返してください。日本語で回答してください。

【重要ルール】
- 1〜2回目の返答：質問を1文で返す
- 締めくくりを求められたとき：質問を一切せず、今日の会話全体への感謝・共感・励ましを1〜2文で自然に締めくくること。
- 締めくくりは絶対に疑問形で終わらないこと。`;

type Status = 'idle' | 'connecting' | 'connected' | 'error';

type UseGeminiLiveReturn = {
  status: Status;
  displayText: string;
  isAiSpeaking: boolean;
  conversationLog: Message[];
  isConversationComplete: boolean;
  error: string | null;
  inputVolumeLevel: number;
  outputVolumeLevel: number;
  start: () => Promise<void>;
  stop: () => void;
};

function downsamplePcm16(input: Uint8Array, fromRate: number, toRate: number): Uint8Array {
  const samplesIn = new Int16Array(input.buffer, input.byteOffset, Math.floor(input.byteLength / 2));
  const ratio = fromRate / toRate;
  const newLength = Math.floor(samplesIn.length / ratio);
  const samplesOut = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    samplesOut[i] = samplesIn[Math.floor(i * ratio)];
  }
  return new Uint8Array(samplesOut.buffer);
}

export function useGeminiLive(): UseGeminiLiveReturn {
  const [status, setStatus] = useState<Status>('idle');
  const [displayText, setDisplayText] = useState(INITIAL_MESSAGE);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [conversationLog, setConversationLog] = useState<Message[]>([]);
  const [isConversationComplete, setIsConversationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputVolumeLevel, setInputVolumeLevel] = useState(0);
  const [outputVolumeLevel, setOutputVolumeLevel] = useState(0);
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const sessionRef = useRef<Session | null>(null);
  const audioInitializedRef = useRef(false);
  const pendingUserTextRef = useRef('');
  const pendingModelTextRef = useRef('');
  const rallyCountRef = useRef(0);
  const isWrappingUpRef = useRef(false);
  // AI発話中のマイクゲート用（state はコールバック内で参照できないため ref を使う）
  const isAiSpeakingRef = useRef(false);

  useExpoTwoWayAudioEventListener(
    'onMicrophoneData',
    useCallback((event: { data: Uint8Array }) => {
      const session = sessionRef.current;
      // AI発話中はマイクデータを送らない（エコー防止）
      if (!session || isAiSpeakingRef.current) return;
      const base64 = Buffer.from(event.data).toString('base64');
      session.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
    }, [])
  );

  useExpoTwoWayAudioEventListener(
    'onInputVolumeLevelData',
    useCallback((event: { data: number }) => setInputVolumeLevel(event.data), [])
  );

  useExpoTwoWayAudioEventListener(
    'onOutputVolumeLevelData',
    useCallback((event: { data: number }) => setOutputVolumeLevel(event.data), [])
  );

  const finishConversation = useCallback((finalText: string) => {
    const fullText = `${finalText}\n\n${TRANSITION_SUFFIX}`;
    setDisplayText(fullText);
    setConversationLog((prev) => [...prev, { role: 'model', text: fullText }]);
    setIsConversationComplete(true);
    toggleRecording(false);
  }, []);

  const handleMessage = useCallback((message: LiveServerMessage) => {
    const content = message.serverContent;
    if (!content) return;

    const inputText = content.inputTranscription?.text;
    if (inputText) {
      pendingUserTextRef.current += inputText;
    }

    const outputText = content.outputTranscription?.text;
    if (outputText) {
      pendingModelTextRef.current += outputText;
      setDisplayText(pendingModelTextRef.current);
    }

    const parts = content.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData;
      if (inline?.data && inline.mimeType?.startsWith('audio/')) {
        isAiSpeakingRef.current = true;
        setIsAiSpeaking(true);
        const raw = new Uint8Array(Buffer.from(inline.data, 'base64'));
        const downsampled = downsamplePcm16(raw, LIVE_OUTPUT_SAMPLE_RATE, PLAYBACK_SAMPLE_RATE);
        playPCMData(downsampled);
      }
    }

    if (content.turnComplete) {
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
      const userText = pendingUserTextRef.current.trim();
      const modelText = pendingModelTextRef.current.trim();
      pendingUserTextRef.current = '';
      pendingModelTextRef.current = '';

      const newEntries: Message[] = [];
      if (userText) {
        newEntries.push({ role: 'user', text: userText });
        rallyCountRef.current += 1;
      }

      if (isWrappingUpRef.current && modelText) {
        // ラップアップ指示への応答が届いた → 会話終了（Gemini が [END] を発音する必要なし）
        if (newEntries.length) setConversationLog((prev) => [...prev, ...newEntries]);
        finishConversation(modelText);
      } else {
        // MAX_RALLIES - 1 ターン完了時点でラップアップ指示を送り、マイクを止める
        // → 次の AI レスポンスが直接締めくくり文になるため質問生成のタイムラグがなくなる
        const shouldWrapUp = rallyCountRef.current >= MAX_RALLIES - 1 && !isWrappingUpRef.current;

        if (modelText) newEntries.push({ role: 'model', text: modelText });
        if (newEntries.length) setConversationLog((prev) => [...prev, ...newEntries]);

        if (shouldWrapUp) {
          isWrappingUpRef.current = true;
          toggleRecording(false);
          sessionRef.current?.sendRealtimeInput({
            text: '今日の話をありがとう。今日の会話を振り返り、感謝と励ましの言葉で自然に締めくくってください。疑問形で終わらないこと。',
          });
        }
      }
    }
  }, [finishConversation]);

  const start = useCallback(async () => {
    setError(null);
    setDisplayText(INITIAL_MESSAGE);
    setConversationLog([]);
    setIsConversationComplete(false);
    setStatus('connecting');
    rallyCountRef.current = 0;
    pendingUserTextRef.current = '';
    pendingModelTextRef.current = '';
    isWrappingUpRef.current = false;
    isAiSpeakingRef.current = false;

    if (!micPermission?.granted) {
      const res = await requestMicPermission();
      if (!res.granted) {
        setError('マイク権限がありません');
        setStatus('error');
        return;
      }
    }

    if (!audioInitializedRef.current) {
      await initializeAudio();
      audioInitializedRef.current = true;
    }

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError('EXPO_PUBLIC_GEMINI_API_KEY が未設定です');
      setStatus('error');
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
              silenceDurationMs: 1500,
            },
          },
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            toggleRecording(true);
          },
          onmessage: handleMessage,
          onerror: (e) => {
            setError(`接続エラー: ${e?.message ?? '不明なエラー'}`);
            setStatus('error');
          },
          onclose: (e) => {
            setStatus('idle');
            toggleRecording(false);
            if (e?.code && e.code !== 1000) {
              setError(`切断されました (code: ${e.code}${e.reason ? ` ${e.reason}` : ''})`);
            }
          },
        },
      });
      sessionRef.current = session;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [micPermission, requestMicPermission, handleMessage]);

  const stop = useCallback(() => {
    toggleRecording(false);
    sessionRef.current?.close();
    sessionRef.current = null;
    setStatus('idle');
  }, []);

  return {
    status,
    displayText,
    isAiSpeaking,
    conversationLog,
    isConversationComplete,
    error,
    inputVolumeLevel,
    outputVolumeLevel,
    start,
    stop,
  };
}
