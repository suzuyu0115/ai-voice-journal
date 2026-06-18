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
import { COLORS, SHADOWS, RADIUS } from '../../src/constants/theme';

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

type Milestone = { emoji: string; message: string; color: string };

function getMilestone(streak: number): Milestone {
  if (streak >= 365) return { emoji: '👑', message: '1年達成！伝説だ',     color: '#92400E' };
  if (streak >= 100) return { emoji: '💎', message: '100日突破！最強',     color: '#6366F1' };
  if (streak >= 30)  return { emoji: '🏆', message: '1ヶ月達成！',         color: '#EC4899' };
  if (streak >= 14)  return { emoji: '⚡', message: '2週間突破！',         color: '#8B5CF6' };
  if (streak >= 7)   return { emoji: '🌟', message: '1週間達成！',         color: '#F59E0B' };
  if (streak >= 3)   return { emoji: '💪', message: '3日坊主じゃない！',   color: '#F97316' };
  if (streak >= 2)   return { emoji: '✨', message: 'いい調子！',           color: '#F97316' };
  return               { emoji: '🌱', message: '記録スタート！',           color: '#06B6D4' };
}

function StreakCard({ streak }: { streak: number }) {
  const { emoji, message, color } = getMilestone(streak);
  return (
    <View style={[sc.card, { backgroundColor: color }]}>
      <View style={sc.bgCircle} />
      <View style={sc.inner}>
        <Text style={sc.flame}>🔥</Text>
        <View style={sc.numBlock}>
          <Text style={sc.number}>{streak}</Text>
          <Text style={sc.unit}>日連続</Text>
        </View>
        <View style={sc.divider} />
        <View style={sc.badgeBlock}>
          <Text style={sc.badgeEmoji}>{emoji}</Text>
          <Text style={sc.badgeText}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

function EntryCard({ entry, onPress }: { entry: DiaryListEntry; onPress: () => void }) {
  const dow = formatDow(entry.created_at);
  const isSunday = new Date(entry.created_at).getDay() === 0;
  const isSaturday = new Date(entry.created_at).getDay() === 6;
  const accentColor = isSunday ? '#EF4444' : isSaturday ? '#3B82F6' : COLORS.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.dateBadge, { borderLeftColor: accentColor }]}>
        <Text style={[styles.dow, { color: accentColor }]}>{dow}</Text>
        <Text style={[styles.day, { color: accentColor }]}>{formatDay(entry.created_at)}</Text>
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
      <Ionicons name="chevron-forward" size={15} color={COLORS.textTertiary} />
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      {streak >= 1 && <StreakCard streak={streak} />}

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={14} color={COLORS.error} />
          <Text style={styles.errorText}>読み込みに失敗しました</Text>
        </View>
      )}

      {entries.length === 0 && !error ? (
        <View style={styles.centered}>
          <View style={styles.emptyIllustration}>
            <Text style={styles.emptyIcon}>📓</Text>
          </View>
          <Text style={styles.emptyTitle}>まだ日記がありません</Text>
          <Text style={styles.emptyBody}>AIと話すだけで{'\n'}日記が完成します</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/conversation')}
            activeOpacity={0.85}
          >
            <Ionicons name="mic" size={18} color="#fff" />
            <Text style={styles.startButtonText}>会話を始める</Text>
          </TouchableOpacity>
          <Text style={styles.emptyHint}>✦ 話すだけで日記になる</Text>
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
          <Ionicons name="mic" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ── StreakCard スタイル ──────────────────────────────────────────
const sc = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  bgCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    top: -80,
    right: -50,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 4,
  },
  flame: { fontSize: 30, lineHeight: 36, marginRight: 2 },
  numBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  number: { fontSize: 44, fontWeight: '900', color: '#fff', lineHeight: 50, letterSpacing: -1 },
  unit: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: 2 },
  divider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 14 },
  badgeBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeEmoji: { fontSize: 20, lineHeight: 24 },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#fff', flexShrink: 1 },
});

// ── 共通スタイル ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  errorText: { fontSize: 13, color: COLORS.error },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },

  listContent: { paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...SHADOWS.sm,
  },
  dateBadge: {
    width: 46,
    alignItems: 'center',
    marginRight: 14,
    borderLeftWidth: 3,
    paddingLeft: 8,
  },
  dow: { fontSize: 11, fontWeight: '700' },
  day: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  time: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },

  cardBody: { flex: 1 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  entryPreview: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  // Empty state
  emptyIllustration: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  emptyBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    gap: 8,
    ...SHADOWS.md,
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  emptyHint: {
    marginTop: 16,
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
});
