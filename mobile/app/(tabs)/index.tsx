import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useDiaryList, type DiaryListEntry } from '../../src/hooks/useDiaryList';

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

function formatDow(iso: string) {
  return DOW_JA[new Date(iso).getDay()];
}

function formatDay(iso: string) {
  return new Date(iso).getDate().toString();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getSectionKey(iso: string): string {
  const entryDate = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (entryDate === today) return '今日';
  if (entryDate === yesterday) return '昨日';
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

type Section = { title: string; data: DiaryListEntry[] };

function groupEntries(entries: DiaryListEntry[]): Section[] {
  const sectionMap = new Map<string, DiaryListEntry[]>();
  for (const entry of entries) {
    const key = getSectionKey(entry.created_at);
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key)!.push(entry);
  }
  return Array.from(sectionMap.entries()).map(([title, data]) => ({ title, data }));
}

function calcStreak(entries: DiaryListEntry[]): number {
  if (entries.length === 0) return 0;
  const dates = new Set(entries.map((e) => e.created_at.slice(0, 10)));
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function EntryCard({ entry, onPress }: { entry: DiaryListEntry; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.dateBadge}>
        <Text style={styles.dow}>{formatDow(entry.created_at)}</Text>
        <Text style={styles.day}>{formatDay(entry.created_at)}</Text>
        <Text style={styles.time}>{formatTime(entry.created_at)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.entryTitle} numberOfLines={1}>
          {entry.title || '（タイトルなし）'}
        </Text>
        <Text style={styles.entryPreview} numberOfLines={2}>
          {entry.diary_text || ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { entries, loading, error, refetch } = useDiaryList();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const streak = calcStreak(entries);
  const sections = groupEntries(entries);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      {streak >= 2 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakText}>🔥 {streak}日連続記録中</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>読み込みに失敗しました</Text>
        </View>
      )}

      {entries.length === 0 && !error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📓</Text>
          <Text style={styles.emptyTitle}>日記がまだありません</Text>
          <Text style={styles.emptyBody}>AIと話して今日の出来事を記録しましょう</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/conversation')}
          >
            <Ionicons name="mic" size={18} color="#fff" style={styles.startButtonIcon} />
            <Text style={styles.startButtonText}>会話を始める</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              onPress={() => router.push(`/summary/${item.id}`)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}

      {entries.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/conversation')}
          accessibilityLabel="会話を始める"
        >
          <Ionicons name="mic" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  streakBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFF8E7',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  streakText: { fontSize: 13, fontWeight: '600', color: '#D97706' },

  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
  },
  errorText: { fontSize: 13, color: '#e53e3e', textAlign: 'center' },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },

  listContent: { paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dateBadge: { width: 48, alignItems: 'center', marginRight: 14 },
  dow: { fontSize: 11, color: '#4A90E2', fontWeight: '600' },
  day: { fontSize: 28, fontWeight: '700', color: '#4A90E2', lineHeight: 32 },
  time: { fontSize: 11, color: '#888', marginTop: 2 },

  cardBody: { flex: 1 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 3 },
  entryPreview: { fontSize: 13, color: '#888', lineHeight: 18 },

  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 32,
    gap: 8,
  },
  startButtonIcon: {},
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
