import { useJournalStore } from '../journalStore';

beforeEach(() => {
  useJournalStore.setState({ messages: [], pendingMessages: [], entries: [], targetDate: null });
});

describe('journalStore', () => {
  describe('addMessage', () => {
    it('ユーザーメッセージを追加できる', () => {
      useJournalStore.getState().addMessage({ role: 'user', text: 'テストメッセージ' });
      const { messages } = useJournalStore.getState();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: 'user', text: 'テストメッセージ' });
    });

    it('AIメッセージを追加できる', () => {
      useJournalStore.getState().addMessage({ role: 'model', text: 'AI応答' });
      expect(useJournalStore.getState().messages[0].role).toBe('model');
    });

    it('複数のメッセージを順序通りに追加できる', () => {
      useJournalStore.getState().addMessage({ role: 'user', text: '1つ目' });
      useJournalStore.getState().addMessage({ role: 'model', text: '2つ目' });
      expect(useJournalStore.getState().messages).toHaveLength(2);
    });
  });

  describe('clearMessages', () => {
    it('全メッセージをクリアできる', () => {
      useJournalStore.getState().addMessage({ role: 'user', text: 'メッセージ' });
      useJournalStore.getState().clearMessages();
      expect(useJournalStore.getState().messages).toHaveLength(0);
    });
  });

  describe('setPendingMessages', () => {
    it('pendingMessages を設定できる', () => {
      const msgs = [{ role: 'user' as const, text: '今日はよかった' }];
      useJournalStore.getState().setPendingMessages(msgs);
      expect(useJournalStore.getState().pendingMessages).toEqual(msgs);
    });

    it('空配列で pendingMessages をクリアできる', () => {
      useJournalStore.getState().setPendingMessages([{ role: 'user', text: 'テスト' }]);
      useJournalStore.getState().setPendingMessages([]);
      expect(useJournalStore.getState().pendingMessages).toHaveLength(0);
    });
  });

  describe('targetDate', () => {
    it('setTargetDate で targetDate が設定される', () => {
      useJournalStore.getState().setTargetDate('2026-06-15');
      expect(useJournalStore.getState().targetDate).toBe('2026-06-15');
    });

    it('clearPendingMessages で targetDate も null になる', () => {
      useJournalStore.getState().setTargetDate('2026-06-15');
      useJournalStore.getState().clearPendingMessages();
      expect(useJournalStore.getState().targetDate).toBeNull();
    });
  });

  describe('addEntry', () => {
    it('日記エントリを追加できる', () => {
      const entry = {
        id: '1',
        title: 'テストタイトル',
        body: 'テスト本文',
        createdAt: '2026-06-07T00:00:00Z',
      };
      useJournalStore.getState().addEntry(entry);
      expect(useJournalStore.getState().entries).toHaveLength(1);
      expect(useJournalStore.getState().entries[0]).toEqual(entry);
    });

    it('新しいエントリが先頭に追加される', () => {
      useJournalStore.getState().addEntry({ id: '1', title: '古い', body: '古い本文', createdAt: '2026-06-06T00:00:00Z' });
      useJournalStore.getState().addEntry({ id: '2', title: '新しい', body: '新しい本文', createdAt: '2026-06-07T00:00:00Z' });
      expect(useJournalStore.getState().entries[0].id).toBe('2');
    });
  });
});
