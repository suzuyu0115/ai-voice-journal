import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSummary } from '../../src/hooks/useSummary';
import { useDiaryEntry } from '../../src/hooks/useDiaryEntry';
import { updateDiaryEntry, deleteDiaryEntry } from '../../src/lib/supabase';
import { useJournalStore } from '../../src/store/journalStore';
import { BottomTabBar } from '../../src/components/BottomTabBar';

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  const dow = DOW_JA[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

export default function SummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pendingMessages } = useJournalStore();
  const isViewMode = pendingMessages.length === 0;

  // 表示モード: Supabase から既存エントリーを取得
  const { entry, loading: entryLoading, error: entryError } = useDiaryEntry(isViewMode ? id : null);

  // 作成モード: 会話からサマリーを生成
  const { title, body, setTitle, setBody, isGenerating, isSaving, error, saveEntry, retry } = useSummary();

  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 表示モード用の編集状態
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleSave = async () => {
    const savedId = await saveEntry();
    if (savedId !== null) {
      router.replace('/');
    }
  };

  const handleEditStart = (currentTitle: string, currentBody: string) => {
    setEditTitle(currentTitle);
    setEditBody(currentBody);
    setIsEditing(true);
  };

  const handleDelete = () => {
    Alert.alert(
      '日記を削除',
      'この日記を削除しますか？この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await deleteDiaryEntry(id);
              router.back();
            } catch {
              Alert.alert('削除失敗', '日記の削除に失敗しました。もう一度お試しください。');
            }
          },
        },
      ]
    );
  };

  const handleEditSave = async () => {
    if (!id) return;
    setIsSavingEdit(true);
    try {
      await updateDiaryEntry(id, { title: editTitle, diary_text: editBody });
      setIsEditing(false);
    } catch {
      Alert.alert('保存失敗', '日記の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ─── 表示モード ───
  if (isViewMode) {
    const headerTitle = entry ? formatDate(entry.created_at) : '日記詳細';

    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: headerTitle, headerBackVisible: true, headerBackTitle: '', headerBackButtonDisplayMode: 'minimal' }} />

        {entryLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        ) : entryError || !entry ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>日記の読み込みに失敗しました</Text>
            <TouchableOpacity style={styles.discardButton} onPress={() => router.back()}>
              <Text style={styles.discardText}>戻る</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={[styles.editToggle, isEditing && styles.editToggleActive]}
                onPress={() => isEditing ? handleEditSave() : handleEditStart(entry.title, entry.diary_text)}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#4A90E2" />
                ) : (
                  <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                    {isEditing ? '保存' : '✏️ 編集'}
                  </Text>
                )}
              </TouchableOpacity>
              {!isEditing && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>🗑️ 削除</Text>
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              <TextInput
                style={styles.titleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="タイトルを入力"
                placeholderTextColor="#bbb"
                maxLength={50}
              />
            ) : (
              <Text style={styles.titleText}>{entry.title || '（タイトルなし）'}</Text>
            )}

            <View style={styles.bodyCard}>
              {isEditing ? (
                <TextInput
                  style={styles.bodyInput}
                  value={editBody}
                  onChangeText={setEditBody}
                  placeholder="本文を入力"
                  placeholderTextColor="#bbb"
                  multiline
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.bodyText}>{entry.diary_text || '（本文なし）'}</Text>
              )}
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.discardButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.discardText}>キャンセル</Text>
              </TouchableOpacity>
            )}

            {entry.conversation_log?.length > 0 && !isEditing && (
              <View style={styles.historySection}>
                <TouchableOpacity style={styles.historyToggle} onPress={() => setShowHistory(!showHistory)}>
                  <Text style={styles.historyToggleText}>
                    {showHistory ? '▲ 会話履歴を閉じる' : '▼ 会話履歴を見る'}
                  </Text>
                </TouchableOpacity>
                {showHistory && (
                  <View style={styles.historyList}>
                    {entry.conversation_log.map((msg, i) => (
                      <View key={i} style={[styles.historyItem, msg.role === 'user' ? styles.historyUser : styles.historyAI]}>
                        <Text style={styles.historyRole}>{msg.role === 'user' ? 'あなた' : 'AI'}</Text>
                        <Text style={styles.historyText}>{msg.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {!isEditing && (
              <TouchableOpacity style={styles.discardButton} onPress={() => router.back()}>
                <Text style={styles.discardText}>← カレンダーに戻る</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        <BottomTabBar />
      </View>
    );
  }

  // ─── 作成モード（会話後）───
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'サマリー', headerBackVisible: false }} />

      {isGenerating ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.generatingText}>日記を作成しています...</Text>
        </View>
      ) : (error && !title && !body) ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>エラーが発生しました</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={retry}>
            <Text style={styles.primaryButtonText}>再試行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.discardButton} onPress={() => router.replace('/')}>
            <Text style={styles.discardText}>ホームへ戻る</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <Text style={styles.dateLabel}>
              {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
            <TouchableOpacity
              style={[styles.editToggle, isEditing && styles.editToggleActive]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={[styles.editToggleText, isEditing && styles.editToggleTextActive]}>
                {isEditing ? '完了' : '✏️ 編集'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="タイトルを入力"
              placeholderTextColor="#bbb"
              maxLength={30}
            />
          ) : (
            <Text style={styles.titleText}>{title || '（タイトルなし）'}</Text>
          )}

          <View style={styles.bodyCard}>
            {isEditing ? (
              <TextInput
                style={styles.bodyInput}
                value={body}
                onChangeText={setBody}
                placeholder="本文を入力"
                placeholderTextColor="#bbb"
                multiline
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.bodyText}>{body || '（本文なし）'}</Text>
            )}
          </View>

          {pendingMessages.length > 0 && (
            <View style={styles.historySection}>
              <TouchableOpacity style={styles.historyToggle} onPress={() => setShowHistory(!showHistory)}>
                <Text style={styles.historyToggleText}>
                  {showHistory ? '▲ 会話履歴を閉じる' : '▼ 会話履歴を見る'}
                </Text>
              </TouchableOpacity>
              {showHistory && (
                <View style={styles.historyList}>
                  {pendingMessages.map((msg, i) => (
                    <View key={i} style={[styles.historyItem, msg.role === 'user' ? styles.historyUser : styles.historyAI]}>
                      <Text style={styles.historyRole}>{msg.role === 'user' ? 'あなた' : 'AI'}</Text>
                      <Text style={styles.historyText}>{msg.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>保存に失敗しました: {error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>保存してホームへ</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardButton} onPress={() => router.replace('/')}>
            <Text style={styles.discardText}>保存せずに戻る</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 32, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  generatingText: { marginTop: 16, fontSize: 16, color: '#666' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16, gap: 8 },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e53e3e',
  },
  deleteButtonText: { fontSize: 13, color: '#e53e3e', fontWeight: '600' },
  dateLabel: { fontSize: 13, color: '#999' },
  editToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  editToggleActive: { backgroundColor: '#4A90E2' },
  editToggleText: { fontSize: 13, color: '#4A90E2', fontWeight: '600' },
  editToggleTextActive: { color: '#fff' },
  titleText: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
    paddingBottom: 6,
    marginBottom: 16,
  },
  bodyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 200,
    flex: 1,
  },
  bodyText: { fontSize: 16, lineHeight: 28, color: '#333' },
  bodyInput: { fontSize: 16, lineHeight: 28, color: '#333', minHeight: 200 },
  historySection: { marginTop: 24 },
  historyToggle: { paddingVertical: 10, alignItems: 'center' },
  historyToggleText: { fontSize: 13, color: '#4A90E2', fontWeight: '600' },
  historyList: { marginTop: 8, gap: 8 },
  historyItem: { borderRadius: 12, padding: 12 },
  historyUser: { backgroundColor: '#EBF4FF', alignSelf: 'flex-end', maxWidth: '85%' },
  historyAI: { backgroundColor: '#fff', alignSelf: 'flex-start', maxWidth: '85%', borderWidth: 1, borderColor: '#eee' },
  historyRole: { fontSize: 10, color: '#999', marginBottom: 4, fontWeight: '600' },
  historyText: { fontSize: 14, color: '#333', lineHeight: 20 },
  errorBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  errorBannerText: { color: '#CC0000', fontSize: 13 },
  errorText: { fontSize: 18, fontWeight: '600', color: '#CC0000', marginBottom: 8 },
  errorDetail: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
  },
  primaryButtonDisabled: { backgroundColor: '#aaa' },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  discardButton: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  discardText: { color: '#999', fontSize: 15 },
});
