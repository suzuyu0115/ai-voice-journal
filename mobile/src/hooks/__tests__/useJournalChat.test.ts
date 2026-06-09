import React from 'react';
import { create, act } from 'react-test-renderer';
import { useJournalChat, MAX_RALLIES, INITIAL_MESSAGE, CLOSING_MESSAGE } from '../useJournalChat';

import { sendMessageStream } from '../../lib/gemini';
import * as Speech from 'expo-speech';

jest.mock('../../lib/gemini', () => ({
  sendMessageStream: jest.fn(),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => {
    options?.onDone?.();
  }),
  stop: jest.fn(),
}));

const mockSendMessageStream = sendMessageStream as jest.Mock;
const mockSpeak = Speech.speak as jest.Mock;
const mockStop = Speech.stop as jest.Mock;

async function* makeStream(...chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

type HookResult = ReturnType<typeof useJournalChat>;

function renderJournalChatHook() {
  const ref = { current: undefined as unknown as HookResult };
  function TestComponent() {
    ref.current = useJournalChat();
    return null;
  }
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(React.createElement(TestComponent)); });
  return { result: ref, renderer: renderer! };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMessageStream.mockImplementation(() => makeStream('今日はどんなことがありましたか？'));
});

describe('useJournalChat', () => {
  it('初期状態では INITIAL_MESSAGE が表示されている', () => {
    const { result } = renderJournalChatHook();
    expect(result.current.messages).toEqual([{ role: 'model', text: INITIAL_MESSAGE }]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isConversationComplete).toBe(false);
  });

  it('sendUserMessage でユーザーメッセージが追加される', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    expect(result.current.messages[1]).toEqual({ role: 'user', text: '今日は疲れた' });
  });

  it('AI応答がストリーミングで結合される', async () => {
    mockSendMessageStream.mockImplementation(() => makeStream('今日は', 'どんなことが', 'ありましたか？'));
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage).toEqual({ role: 'model', text: '今日はどんなことがありましたか？' });
  });

  it('送信完了後 isLoading は false になる', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('テスト'); });
    expect(result.current.isLoading).toBe(false);
  });

  it('AI返答を expo-speech で読み上げる（volume: 1.0）', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    expect(mockSpeak).toHaveBeenCalledWith(
      '今日はどんなことがありましたか？',
      expect.objectContaining({ language: 'ja-JP', volume: 1.0 })
    );
  });

  it('エラー時に isError が true、errorMessage にメッセージが入る', async () => {
    mockSendMessageStream.mockImplementation(async function* () { throw new Error('API error'); });
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('テスト'); });
    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe('API error');
    expect(result.current.isLoading).toBe(false);
  });

  it('clearMessages で INITIAL_MESSAGE にリセットされ speech が止まる', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    act(() => { result.current.clearMessages(); });
    expect(result.current.messages).toEqual([{ role: 'model', text: INITIAL_MESSAGE }]);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isConversationComplete).toBe(false);
    expect(mockStop).toHaveBeenCalled();
  });

  it('[END] マーカーで isConversationComplete が true になり CLOSING_MESSAGE は追加されない', async () => {
    mockSendMessageStream.mockImplementation(() => makeStream('お疲れさまでした。[END]'));
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    expect(result.current.isConversationComplete).toBe(true);
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last).toEqual({ role: 'model', text: 'お疲れさまでした。' });
  });

  it('[END] マーカーは表示テキストから除去される', async () => {
    mockSendMessageStream.mockImplementation(() => makeStream('お疲れさまでした。[END]'));
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    const aiMessage = result.current.messages.find(m => m.text === 'お疲れさまでした。');
    expect(aiMessage).toBeDefined();
  });

  it(`最終ラリーで [END] なしの場合 AI 返答をそのまま表示して isConversationComplete が true`, async () => {
    const { result } = renderJournalChatHook();
    for (let i = 0; i < MAX_RALLIES; i++) {
      await act(async () => { await result.current.sendUserMessage(`メッセージ${i + 1}`); });
    }
    expect(result.current.isConversationComplete).toBe(true);
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last.role).toBe('model');
  });

  it('MAX_RALLIES 未満ではまだ isConversationComplete は false', async () => {
    const { result } = renderJournalChatHook();
    for (let i = 0; i < MAX_RALLIES - 1; i++) {
      await act(async () => { await result.current.sendUserMessage(`メッセージ${i + 1}`); });
    }
    expect(result.current.isConversationComplete).toBe(false);
  });
});
