import { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig, type CalendarProps, type DateData } from 'react-native-calendars';
import { router, useFocusEffect } from 'expo-router';
import { useCalendarEntries, type CalendarEntry } from '../../src/hooks/useCalendarEntries';
import { useJournalStore } from '../../src/store/journalStore';
import { COLORS, SHADOWS, RADIUS } from '../../src/constants/theme';

LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

type MarkedDates = NonNullable<CalendarProps['markedDates']>;

const ENTRY_COLOR = '#34D399';
const SUNDAY_COLOR = '#EF4444';
const SATURDAY_COLOR = '#3B82F6';
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;

function toMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function buildWeekendMarks(month: string): MarkedDates {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const marks: MarkedDates = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, monthNum - 1, day).getDay();
    if (dow !== 0 && dow !== 6) continue;
    const key = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    marks[key] = {
      customStyles: {
        text: { color: dow === 0 ? SUNDAY_COLOR : SATURDAY_COLOR, fontWeight: '500' },
      },
    };
  }
  return marks;
}

function formatBanner(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = DOW_JA[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

function EntryCard({ entry, onPress }: { entry: CalendarEntry; onPress: () => void }) {
  const d = new Date(entry.created_at);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTimeCol}>
        <Ionicons name="time-outline" size={13} color={COLORS.textTertiary} />
        <Text style={styles.cardTime}>{time}</Text>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardRight}>
        <Text style={styles.cardBody} numberOfLines={3}>
          {entry.diary_text || '（内容なし）'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const { setTargetDate } = useJournalStore();

  const displayMonthStr = toMonthKey(displayMonth.year, displayMonth.month);
  const { entriesByDate, loading, refetch } = useCalendarEntries(displayMonthStr);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // ── スライドアニメーション ─────────────────────────────────────
  const [slideAnim] = useState(() => new Animated.Value(0));

  const changeMonth = useCallback((direction: 'next' | 'prev') => {
    const exitTo = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    Animated.timing(slideAnim, {
      toValue: exitTo,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDisplayMonth((prev) => {
        const d = direction === 'next'
          ? new Date(prev.year, prev.month, 1)
          : new Date(prev.year, prev.month - 2, 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      });
      slideAnim.setValue(-exitTo);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [slideAnim]);

  // 常に最新の changeMonth を参照するための ref（PanResponder の stale closure 対策）
  const changeMonthRef = useRef(changeMonth);
  useEffect(() => { changeMonthRef.current = changeMonth; }, [changeMonth]);

  // ── スワイプジェスチャー ──────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20,
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -SWIPE_THRESHOLD) changeMonthRef.current('next');
        else if (dx > SWIPE_THRESHOLD) changeMonthRef.current('prev');
      },
    })
  ).current;

  // ── カレンダーのマーク ─────────────────────────────────────────
  const entryMarks = Object.keys(entriesByDate).reduce<MarkedDates>((acc, date) => {
    acc[date] = {
      customStyles: {
        container: { backgroundColor: ENTRY_COLOR, borderRadius: 6 },
        text: { color: '#fff', fontWeight: '700' },
      },
    };
    return acc;
  }, {} as MarkedDates);

  const selectedMark: MarkedDates = !entryMarks[selectedDate]
    ? {
        [selectedDate]: {
          customStyles: {
            container: {
              backgroundColor: COLORS.primary,
              borderRadius: 20,
              width: 34,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
            },
            text: { color: '#fff', fontWeight: '700' },
          },
        },
      }
    : {};

  const markedDates: MarkedDates = {
    ...buildWeekendMarks(displayMonthStr),
    ...entryMarks,
    ...selectedMark,
  };

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const selectedEntries = entriesByDate[selectedDate] ?? [];

  return (
    <View style={styles.container}>
      {/* ヘッダー（月ナビゲーション） */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => changeMonth('prev')}
          style={styles.arrowBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.monthPill}>
          <Text style={styles.monthPillText}>
            {displayMonth.year}年{displayMonth.month}月
          </Text>
          {loading && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={styles.monthLoader}
            />
          )}
        </View>

        <TouchableOpacity
          onPress={() => changeMonth('next')}
          style={styles.arrowBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* スワイプ対応エリア（カレンダー + バナー） */}
      <View style={styles.slideWrapper} {...panResponder.panHandlers}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <Calendar
            key={displayMonthStr}
            current={`${displayMonthStr}-01`}
            hideArrows
            renderHeader={() => <View />}
            markingType="custom"
            markedDates={loading ? buildWeekendMarks(displayMonthStr) : markedDates}
            onDayPress={handleDayPress}
            theme={
              {
                textSectionTitleColor: COLORS.textSecondary,
                'stylesheet.calendar.header': {
                  header: { height: 0, overflow: 'hidden', marginTop: 0 },
                  week: {
                    marginTop: 0,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    backgroundColor: COLORS.background,
                  },
                },
              } as object
            }
          />

          {/* 選択日バナー */}
          <View style={styles.banner}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.bannerText}>{formatBanner(selectedDate)}</Text>
            {selectedEntries.length > 0 && (
              <View style={styles.entryCountBadge}>
                <Text style={styles.entryCountText}>{selectedEntries.length}件</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* エントリーリスト（スワイプ対象外） */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {selectedEntries.length === 0 ? (
          <View style={styles.emptyDay}>
            <Ionicons name="journal-outline" size={28} color={COLORS.textTertiary} />
            <Text style={styles.emptyDayText}>この日は記録がありません</Text>
            <Text style={styles.emptyDayHint}>右下のボタンで日記を追加できます</Text>
          </View>
        ) : (
          selectedEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onPress={() => router.push(`/summary/${entry.id}`)}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setTargetDate(selectedDate);
          router.push('/conversation');
        }}
        accessibilityLabel="この日の日記を作成"
      >
        <Ionicons name="mic" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  // ヘッダー
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  arrowBtn: { padding: 6 },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginHorizontal: 8,
    gap: 6,
  },
  monthPillText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  monthLoader: { width: 16, height: 16 },

  // スライドエリア
  slideWrapper: {
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },

  // 日付バナー
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  bannerText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', flex: 1 },
  entryCountBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  entryCountText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // エントリーリスト
  list: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 14, gap: 10, paddingBottom: 100 },

  emptyDay: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyDayText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  emptyDayHint: { fontSize: 12, color: COLORS.textTertiary },

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

  // エントリーカード
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 12,
    ...SHADOWS.sm,
  },
  cardTimeCol: { alignItems: 'center', gap: 3, minWidth: 36 },
  cardTime: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  cardDivider: { width: 1, height: '80%', backgroundColor: COLORS.border },
  cardRight: { flex: 1 },
  cardBody: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
});
