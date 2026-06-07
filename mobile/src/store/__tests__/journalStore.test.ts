import { useJournalStore } from '../journalStore';

beforeEach(() => {
  useJournalStore.setState({ messages: [], entries: [] });
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

  describe('addEntry', () => {
    it('日記エントリを追加できる', () => {
      const entry = {
        id: '1',
        summary: 'テスト要約',
        emotionScore: 7,
        createdAt: '2026-06-07T00:00:00Z',
      };
      useJournalStore.getState().addEntry(entry);
      expect(useJournalStore.getState().entries).toHaveLength(1);
      expect(useJournalStore.getState().entries[0]).toEqual(entry);
    });

    it('新しいエントリが先頭に追加される', () => {
      useJournalStore.getState().addEntry({ id: '1', summary: '古い', emotionScore: 5, createdAt: '2026-06-06T00:00:00Z' });
      useJournalStore.getState().addEntry({ id: '2', summary: '新しい', emotionScore: 8, createdAt: '2026-06-07T00:00:00Z' });
      expect(useJournalStore.getState().entries[0].id).toBe('2');
    });
  });
});
