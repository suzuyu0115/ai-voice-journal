import React from 'react';
import { create, act } from 'react-test-renderer';
import {
  initialize,
  playPCMData,
  toggleRecording,
  useExpoTwoWayAudioEventListener,
  useMicrophonePermissions,
} from '@speechmatics/expo-two-way-audio';
import { useGeminiLive, MAX_RALLIES, INITIAL_MESSAGE } from '../useGeminiLive';

type LiveCallbacks = {
  onopen?: () => void;
  onmessage: (e: unknown) => void;
  onerror?: (e: { message?: string }) => void;
  onclose?: (e: { code?: number; reason?: string }) => void;
};

const mockSession = { sendRealtimeInput: jest.fn(), close: jest.fn() };
let capturedCallbacks: LiveCallbacks | undefined;
const mockConnect = jest.fn(({ callbacks }: { callbacks: LiveCallbacks }) => {
  capturedCallbacks = callbacks;
  return Promise.resolve(mockSession);
});

jest.mock('@google/genai/web', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({ live: { connect: mockConnect } })),
  Modality: { AUDIO: 'AUDIO' },
  EndSensitivity: { END_SENSITIVITY_LOW: 'END_SENSITIVITY_LOW' },
}));

jest.mock('@speechmatics/expo-two-way-audio', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  playPCMData: jest.fn(),
  toggleRecording: jest.fn(),
  useExpoTwoWayAudioEventListener: jest.fn(),
  useMicrophonePermissions: jest.fn(),
}));

const mockUseMicPermissions = useMicrophonePermissions as jest.Mock;
const mockUseEventListener = useExpoTwoWayAudioEventListener as jest.Mock;

function getEventHandler(event: string) {
  const call = mockUseEventListener.mock.calls.find(([e]) => e === event);
  return call?.[1] as ((e: { data: unknown }) => void) | undefined;
}

type HookResult = ReturnType<typeof useGeminiLive>;

function renderGeminiLiveHook() {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useGeminiLive();
    return null;
  }
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(TestComponent)); });
  return { result: ref, renderer: renderer! };
}

function pcmBase64(sampleCount = 480) {
  const samples = new Int16Array(sampleCount);
  return Buffer.from(new Uint8Array(samples.buffer)).toString('base64');
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedCallbacks = undefined;
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
  mockUseMicPermissions.mockReturnValue([
    { granted: true },
    jest.fn().mockResolvedValue({ granted: true }),
  ]);
});

describe('useGeminiLive', () => {
  it('初期状態では status が idle、displayText が INITIAL_MESSAGE', () => {
    const { result } = renderGeminiLiveHook();
    expect(result.current.status).toBe('idle');
    expect(result.current.displayText).toBe(INITIAL_MESSAGE);
    expect(result.current.conversationLog).toEqual([]);
    expect(result.current.isConversationComplete).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('入出力の音量レベルイベントが反映される', () => {
    const { result } = renderGeminiLiveHook();
    act(() => { getEventHandler('onInputVolumeLevelData')?.({ data: 0.5 }); });
    act(() => { getEventHandler('onOutputVolumeLevelData')?.({ data: 0.8 }); });
    expect(result.current.inputVolumeLevel).toBe(0.5);
    expect(result.current.outputVolumeLevel).toBe(0.8);
  });

  it('APIキーが未設定の場合 start() でエラーになる', async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('EXPO_PUBLIC_GEMINI_API_KEY が未設定です');
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('接続時に例外が発生した場合 status が error になる', async () => {
    mockConnect.mockRejectedValueOnce(new Error('connect failed'));
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('connect failed');
  });

  it('マイク権限がない場合 start() でエラーになる', async () => {
    mockUseMicPermissions.mockReturnValue([
      { granted: false },
      jest.fn().mockResolvedValue({ granted: false }),
    ]);
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('マイク権限がありません');
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('接続成功(onopen)で status が connected になり録音が開始される', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => { capturedCallbacks?.onopen?.(); });
    expect(initialize).toHaveBeenCalled();
    expect(result.current.status).toBe('connected');
    expect(toggleRecording).toHaveBeenCalledWith(true);
  });

  it('マイクデータイベントで sendRealtimeInput が base64 で呼ばれる', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    const data = new Uint8Array([1, 2, 3]);
    act(() => { getEventHandler('onMicrophoneData')?.({ data }); });
    expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith({
      audio: { data: Buffer.from(data).toString('base64'), mimeType: 'audio/pcm;rate=16000' },
    });
  });

  it('onmessage の outputTranscription が displayText に反映される', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => {
      capturedCallbacks?.onmessage({
        serverContent: { outputTranscription: { text: '今日は楽しかったですね' } },
      });
    });
    expect(result.current.displayText).toBe('今日は楽しかったですね');
  });

  it('onmessage の音声チャンクで playPCMData が呼ばれる', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => {
      capturedCallbacks?.onmessage({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: pcmBase64(), mimeType: 'audio/pcm;rate=24000' } }] },
        },
      });
    });
    expect(playPCMData).toHaveBeenCalled();
  });

  it('turnComplete で conversationLog にユーザー発言とAI発言が追加される', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => {
      capturedCallbacks?.onmessage({ serverContent: { inputTranscription: { text: '今日は疲れた' } } });
      capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: 'お疲れさまでした' } } });
      capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
    });
    expect(result.current.conversationLog).toEqual([
      { role: 'user', text: '今日は疲れた' },
      { role: 'model', text: 'お疲れさまでした' },
    ]);
  });


  it('MAX_RALLIES 到達でラップアップ指示が送られ、まだ isConversationComplete は false のまま', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    for (let i = 0; i < MAX_RALLIES; i++) {
      act(() => {
        capturedCallbacks?.onmessage({ serverContent: { inputTranscription: { text: `発言${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: `返答${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
      });
    }
    expect(result.current.isConversationComplete).toBe(false);
    expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('直前の質問への返答は不要') })
    );
  });

  it('MAX_RALLIES 到達後にラップアップ応答が届いたら isConversationComplete が true になる（[END] 不要）', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    for (let i = 0; i < MAX_RALLIES; i++) {
      act(() => {
        capturedCallbacks?.onmessage({ serverContent: { inputTranscription: { text: `発言${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: `返答${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
      });
    }
    // [END] なしのラップアップ応答
    act(() => {
      capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: '今日もお疲れさまでした。' } } });
      capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
    });
    expect(result.current.isConversationComplete).toBe(true);
  });

  it('最終ラリーのAI音声・テキストはミュートされ、ラップアップ応答は再生される', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });

    // MAX_RALLIES - 1 回まで通常の会話
    for (let i = 0; i < MAX_RALLIES - 1; i++) {
      act(() => {
        capturedCallbacks?.onmessage({ serverContent: { inputTranscription: { text: `発言${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: `返答${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
      });
    }

    const playCallsBefore = (playPCMData as jest.Mock).mock.calls.length;

    // 最終ラリー（MAX_RALLIES回目）の AI 応答はミュートされる
    act(() => {
      capturedCallbacks?.onmessage({ serverContent: { inputTranscription: { text: '最後の発言' } } });
      capturedCallbacks?.onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: pcmBase64(), mimeType: 'audio/pcm;rate=24000' } }] } } } );
      capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: '最後の質問' } } });
      capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
    });

    expect(playPCMData).toHaveBeenCalledTimes(playCallsBefore);
    // displayTextは前のラリーのテキストを保持（空白にならない）
    expect(result.current.displayText).toBe(`返答${MAX_RALLIES - 1}`);

    // ラップアップ応答は再生・表示される
    act(() => {
      capturedCallbacks?.onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: pcmBase64(), mimeType: 'audio/pcm;rate=24000' } }] } } });
      capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: 'お疲れさまでした！' } } });
      capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
    });

    expect(playPCMData).toHaveBeenCalledTimes(playCallsBefore + 1);
    expect(result.current.isConversationComplete).toBe(true);
  });

  it('ラップアップ指示は1度しか送られない', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    for (let i = 0; i < MAX_RALLIES + 2; i++) {
      act(() => {
        capturedCallbacks?.onmessage({ serverContent: { inputTranscription: { text: `発言${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { outputTranscription: { text: `返答${i + 1}` } } });
        capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } });
      });
    }
    const wrapUpCalls = mockSession.sendRealtimeInput.mock.calls.filter(
      ([arg]: [{ text?: string }]) => arg?.text?.includes('直前の質問への返答は不要')
    );
    expect(wrapUpCalls).toHaveLength(1);
  });

  it('onerror で status が error になりエラーメッセージが設定される', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => { capturedCallbacks?.onerror?.({ message: 'boom' }); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('接続エラー: boom');
  });

  it('異常な onclose でエラーメッセージが設定される', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => { capturedCallbacks?.onclose?.({ code: 1006, reason: 'abnormal' }); });
    expect(result.current.error).toContain('1006');
    expect(result.current.status).toBe('idle');
  });

  it('マイク権限が未許可でもリクエストして許可されれば接続する', async () => {
    mockUseMicPermissions.mockReturnValue([
      { granted: false },
      jest.fn().mockResolvedValue({ granted: true }),
    ]);
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    expect(mockConnect).toHaveBeenCalled();
    expect(result.current.status).toBe('connecting');
  });

  it('正常切断(code 1000)ではエラーを設定しない', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => { capturedCallbacks?.onclose?.({ code: 1000 }); });
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('発言・応答どちらも空の turnComplete では conversationLog が増えない', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => { capturedCallbacks?.onmessage({ serverContent: { turnComplete: true } }); });
    expect(result.current.conversationLog).toEqual([]);
  });

  it('stop() で録音停止とセッションクローズが呼ばれる', async () => {
    const { result } = renderGeminiLiveHook();
    await act(async () => { await result.current.start(); });
    act(() => { result.current.stop(); });
    expect(toggleRecording).toHaveBeenCalledWith(false);
    expect(mockSession.close).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });
});
