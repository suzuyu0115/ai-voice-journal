import React from 'react';
import { create, act } from 'react-test-renderer';
import { useJournalChat } from '../useJournalChat';

import { sendMessage } from '../../lib/gemini';
import * as Speech from 'expo-speech';

jest.mock('../../lib/gemini', () => ({
  sendMessage: jest.fn(),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

const mockSendMessage = sendMessage as jest.Mock;
const mockSpeak = Speech.speak as jest.Mock;
const mockStop = Speech.stop as jest.Mock;

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
  mockSendMessage.mockResolvedValue('今日はどんなことがありましたか？');
});

describe('useJournalChat', () => {
  it('初期状態では messages が空', () => {
    const { result } = renderJournalChatHook();
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('sendUserMessage でユーザーメッセージが追加される', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    expect(result.current.messages[0]).toEqual({ role: 'user', text: '今日は疲れた' });
  });

  it('AI応答がメッセージ一覧に追加される', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    expect(result.current.messages[1]).toEqual({ role: 'model', text: '今日はどんなことがありましたか？' });
  });

  it('送信完了後 isLoading は false になる', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('テスト'); });
    expect(result.current.isLoading).toBe(false);
  });

  it('AI返答を expo-speech で読み上げる', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    expect(mockSpeak).toHaveBeenCalledWith(
      '今日はどんなことがありましたか？',
      expect.objectContaining({ language: 'ja-JP' })
    );
  });

  it('エラー時に isError が true になる', async () => {
    mockSendMessage.mockRejectedValue(new Error('API error'));
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('テスト'); });
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('clearMessages でメッセージがリセットされ speech が止まる', async () => {
    const { result } = renderJournalChatHook();
    await act(async () => { await result.current.sendUserMessage('今日は疲れた'); });
    act(() => { result.current.clearMessages(); });
    expect(result.current.messages).toEqual([]);
    expect(mockStop).toHaveBeenCalled();
  });
});
