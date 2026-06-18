import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useSummary } from '../../src/hooks/useSummary';
import { useDiaryEntry } from '../../src/hooks/useDiaryEntry';
import { updateDiaryEntry, deleteDiaryEntry } from '../../src/lib/supabase';
import { useJournalStore } from '../../src/store/journalStore';
import { BottomTabBar } from '../../src/components/BottomTabBar';
import { COLORS, SHADOWS, RADIUS } from '../../src/constants/theme';

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  const dow = DOW_JA[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

function formatDateFromStr(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = DOW_JA[d.getUTCDay()];
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${dow}）`;
}

const TODAY = new Date().toISOString().slice(0, 10);
const MIN_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
})();

function DatePickerModal({
  visible,
  initialDate,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  initialDate: string;
  onConfirm: (dateStr: string) => void;
  onCancel: () => void;
}) {
  const [tempDate, setTempDate] = useState(initialDate);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>日付を変更</Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => onConfirm(tempDate)}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Calendar
            current={initialDate}
            maxDate={TODAY}
            minDate={MIN_DATE}
            onDayPress={(day) => setTempDate(day.dateString)}
            markedDates={{ [tempDate]: { selected: true, selectedColor: COLORS.primary } }}
            theme={{
              todayTextColor: COLORS.primary,
              arrowColor: COLORS.primary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: '#fff',
              textDayFontSize: 16,
              textMonthFontSize: 15,
              textMonthFontWeight: '700',
              calendarBackground: COLORS.surface,
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function SummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pendingMessages, clearPendingMessages } = useJournalStore();
  const isViewMode = pendingMessages.length === 0;

  const { entry, loading: entryLoading, error: entryError, refetch } = useDiaryEntry(isViewMode ? id : null);
  const { title, body, entryDate, setTitle, setBody, setEntryDate, isGenerating, isSaving, error, saveEntry, retry } = useSummary();

  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleSave = async () => {
    const savedId = await saveEntry();
    if (savedId !== null) {
      clearPendingMessages();
      router.replace('/');
    }
  };

  const handleEditStart = (currentTitle: string, currentBody: string, currentDate: string) => {
    setEditTitle(currentTitle);
    setEditBody(currentBody);
    setEditDate(currentDate.slice(0, 10));
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
      await updateDiaryEntry(id, {
        title: editTitle,
        diary_text: editBody,
        created_at: `${editDate}T12:00:00.000Z`,
      });
      setIsEditing(false);
      refetch();
    } catch {
      Alert.alert('保存失敗', '日記の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ─── 表示モード ───
  if (isViewMode) {
    const displayDate = isEditing
      ? formatDateFromStr(editDate)
      : entry
        ? formatDate(entry.created_at)
        : '日記詳細';

    return (
      <View style={styles.screen}>
        <Stack.Screen
          options={{
            headerTitle: () =>
              isEditing ? (
                <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                  <Text style={styles.headerDateBtn}>{displayDate}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.headerDateStatic}>{displayDate}</Text>
              ),
            headerBackVisible: !isEditing,
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: COLORS.surface },
            headerShadowVisible: false,
          }}
        />

        <DatePickerModal
          key={showDatePicker ? (editDate || TODAY) : 'closed'}
          visible={showDatePicker}
          initialDate={editDate || TODAY}
          onConfirm={(date) => { setEditDate(date); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />

        {entryLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : entryError || !entry ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>日記の読み込みに失敗しました</Text>
            <TouchableOpacity style={styles.textButton} onPress={() => router.back()}>
              <Text style={styles.textButtonText}>戻る</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Action bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.actionBtn, isEditing && styles.actionBtnActive]}
                onPress={() => isEditing ? handleEditSave() : handleEditStart(entry.title, entry.diary_text, entry.created_at)}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={isEditing ? '#fff' : COLORS.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={isEditing ? 'checkmark' : 'pencil'}
                      size={14}
                      color={isEditing ? '#fff' : COLORS.primary}
                    />
                    <Text style={[styles.actionBtnText, isEditing && styles.actionBtnTextActive]}>
                      {isEditing ? '保存' : '編集'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {!isEditing && (
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                  <Text style={styles.deleteBtnText}>削除</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Title */}
            {isEditing ? (
              <TextInput
                style={styles.titleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="タイトルを入力"
                placeholderTextColor={COLORS.textTertiary}
                maxLength={50}
              />
            ) : (
              <Text style={styles.titleText}>{entry.title || '（タイトルなし）'}</Text>
            )}

            {/* Body */}
            <View style={styles.bodyCard}>
              {isEditing ? (
                <TextInput
                  style={styles.bodyInput}
                  value={editBody}
                  onChangeText={setEditBody}
                  placeholder="本文を入力"
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.bodyText}>{entry.diary_text || '（本文なし）'}</Text>
              )}
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.textButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.textButtonText}>キャンセル</Text>
              </TouchableOpacity>
            )}

            {/* Conversation history */}
            {entry.conversation_log?.length > 0 && !isEditing && (
              <View style={styles.historySection}>
                <TouchableOpacity style={styles.historyToggle} onPress={() => setShowHistory(!showHistory)}>
                  <Ionicons
                    name={showHistory ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={styles.historyToggleText}>
                    {showHistory ? '会話履歴を閉じる' : '会話履歴を見る'}
                  </Text>
                </TouchableOpacity>
                {showHistory && (
                  <View style={styles.historyList}>
                    {entry.conversation_log.map((msg, i) => (
                      <View
                        key={i}
                        style={[
                          styles.historyItem,
                          msg.role === 'user' ? styles.historyUser : styles.historyAI,
                        ]}
                      >
                        <Text style={styles.historyRole}>{msg.role === 'user' ? 'あなた' : 'AI'}</Text>
                        <Text style={styles.historyText}>{msg.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {!isEditing && (
              <TouchableOpacity style={styles.textButton} onPress={() => router.back()}>
                <Text style={styles.textButtonText}>← 戻る</Text>
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
      <Stack.Screen
        options={{
          headerTitle: () => (
            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <View style={styles.datePickerBtn}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                <Text style={styles.headerDateBtn}>{formatDateFromStr(entryDate)}</Text>
              </View>
            </TouchableOpacity>
          ),
          headerBackVisible: false,
          headerStyle: { backgroundColor: COLORS.surface },
          headerShadowVisible: false,
        }}
      />

      <DatePickerModal
        key={showDatePicker ? entryDate : 'closed'}
        visible={showDatePicker}
        initialDate={entryDate}
        onConfirm={(date) => { setEntryDate(date); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />

      {isGenerating ? (
        <View style={styles.centered}>
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.generatingTitle}>日記を作成しています</Text>
            <Text style={styles.generatingSubtitle}>会話の内容をまとめています...</Text>
          </View>
        </View>
      ) : (error && !title && !body) ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={retry}>
            <Text style={styles.primaryButtonText}>再試行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.textButton} onPress={() => router.replace('/')}>
            <Text style={styles.textButtonText}>ホームへ戻る</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionBtn, isEditing && styles.actionBtnActive]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons
                name={isEditing ? 'checkmark' : 'pencil'}
                size={14}
                color={isEditing ? '#fff' : COLORS.primary}
              />
              <Text style={[styles.actionBtnText, isEditing && styles.actionBtnTextActive]}>
                {isEditing ? '完了' : '編集'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="タイトルを入力"
              placeholderTextColor={COLORS.textTertiary}
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
                placeholderTextColor={COLORS.textTertiary}
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
                <Ionicons
                  name={showHistory ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.historyToggleText}>
                  {showHistory ? '会話履歴を閉じる' : '会話履歴を見る'}
                </Text>
              </TouchableOpacity>
              {showHistory && (
                <View style={styles.historyList}>
                  {pendingMessages.map((msg, i) => (
                    <View
                      key={i}
                      style={[
                        styles.historyItem,
                        msg.role === 'user' ? styles.historyUser : styles.historyAI,
                      ]}
                    >
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
              <Ionicons name="warning-outline" size={14} color={COLORS.error} />
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
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>保存してホームへ</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textButton}
            onPress={() => { clearPendingMessages(); router.replace('/'); }}
          >
            <Text style={styles.textButtonText}>保存せずに戻る</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // Header
  headerDateBtn: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  headerDateStatic: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  actionBtnTextActive: { color: '#fff' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  deleteBtnText: { fontSize: 13, color: COLORS.error, fontWeight: '700' },

  // Title
  titleText: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16, lineHeight: 30 },
  titleInput: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 6,
    marginBottom: 16,
  },

  // Body card
  bodyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOWS.sm,
    minHeight: 200,
    flex: 1,
  },
  bodyText: { fontSize: 16, lineHeight: 28, color: COLORS.textPrimary },
  bodyInput: { fontSize: 16, lineHeight: 28, color: COLORS.textPrimary, minHeight: 200 },

  // History
  historySection: { marginTop: 24 },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  historyToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  historyList: { marginTop: 8, gap: 8 },
  historyItem: { borderRadius: RADIUS.md, padding: 12 },
  historyUser: { backgroundColor: COLORS.bubbleUser, alignSelf: 'flex-end', maxWidth: '85%' },
  historyAI: { backgroundColor: COLORS.surface, alignSelf: 'flex-start', maxWidth: '85%', borderWidth: 1, borderColor: COLORS.border },
  historyRole: { fontSize: 10, color: COLORS.textTertiary, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  historyText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: RADIUS.full,
    ...SHADOWS.md,
  },
  primaryButtonDisabled: { backgroundColor: COLORS.textTertiary },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  textButton: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  textButtonText: { color: COLORS.textSecondary, fontSize: 15 },

  // Generating state
  generatingContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    width: '100%',
  },
  generatingTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  generatingSubtitle: { fontSize: 14, color: COLORS.textSecondary },

  // Error states
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.error, marginTop: 12, marginBottom: 8 },
  errorDetail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  errorText: { fontSize: 16, fontWeight: '600', color: COLORS.error, marginBottom: 12 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  errorBannerText: { color: COLORS.error, fontSize: 13, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
