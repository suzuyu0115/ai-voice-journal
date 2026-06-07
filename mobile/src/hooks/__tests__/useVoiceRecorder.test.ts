import React from 'react';
import { create, act } from 'react-test-renderer';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { PermissionStatus } from 'expo-modules-core';
import { useVoiceRecorder } from '../useVoiceRecorder';

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

const mockModule = ExpoSpeechRecognitionModule as jest.Mocked<typeof ExpoSpeechRecognitionModule>;
const mockUseSpeechEvent = useSpeechRecognitionEvent as jest.Mock;

function getEventHandler(event: string) {
  const call = mockUseSpeechEvent.mock.calls.find(([e]) => e === event);
  return call?.[1] as ((e: Record<string, unknown>) => void) | undefined;
}

type HookResult = ReturnType<typeof useVoiceRecorder>;

function renderVoiceRecorderHook() {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useVoiceRecorder();
    return null;
  }
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(TestComponent)); });
  return { result: ref, renderer: renderer! };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockModule.requestPermissionsAsync.mockResolvedValue({
    granted: true, status: PermissionStatus.GRANTED, expires: 'never', canAskAgain: true,
  });
});

describe('useVoiceRecorder', () => {
  it('初期状態では isRecording が false', () => {
    const { result } = renderVoiceRecorderHook();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.interimTranscript).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('startRecording で録音が開始される', async () => {
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    expect(mockModule.start).toHaveBeenCalledWith({ lang: 'ja-JP', interimResults: true });
    expect(result.current.isRecording).toBe(true);
  });

  it('stopRecording で stop が呼ばれる', async () => {
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    act(() => { result.current.stopRecording(); });
    expect(mockModule.stop).toHaveBeenCalled();
  });

  it('マイク権限がない場合にエラーを返す', async () => {
    mockModule.requestPermissionsAsync.mockResolvedValue({
      granted: false, status: PermissionStatus.DENIED, expires: 'never', canAskAgain: false,
    });
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe('マイク権限がありません');
    expect(mockModule.start).not.toHaveBeenCalled();
  });

  it('認識中のテキストがリアルタイムで更新される', async () => {
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    act(() => {
      getEventHandler('result')?.({ isFinal: false, results: [{ transcript: '今日は' }] });
    });
    expect(result.current.interimTranscript).toBe('今日は');
    expect(result.current.transcript).toBe('');
  });

  it('認識完了で transcript が確定し interimTranscript がクリアされる', async () => {
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    act(() => {
      getEventHandler('result')?.({ isFinal: true, results: [{ transcript: '今日はいい天気でした' }] });
    });
    expect(result.current.transcript).toBe('今日はいい天気でした');
    expect(result.current.interimTranscript).toBe('');
  });

  it('end イベントで isRecording が false になる', async () => {
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    act(() => { getEventHandler('end')?.({}); });
    expect(result.current.isRecording).toBe(false);
  });

  it('error イベントで error が設定され isRecording が false になる', async () => {
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    act(() => { getEventHandler('error')?.({ message: '音声認識エラー' }); });
    expect(result.current.error).toBe('音声認識エラー');
    expect(result.current.isRecording).toBe(false);
  });

  it('error イベントで message がない場合はデフォルトメッセージを使う', async () => {
    const { result } = renderVoiceRecorderHook();
    await act(async () => { await result.current.startRecording(); });
    act(() => { getEventHandler('error')?.({}); });
    expect(result.current.error).toBe('エラーが発生しました');
  });
});
