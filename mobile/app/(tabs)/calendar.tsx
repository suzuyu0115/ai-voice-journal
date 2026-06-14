import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig, type CalendarProps, type DateData } from 'react-native-calendars';
import { router, useFocusEffect } from 'expo-router';
import { useCalendarEntries, type CalendarEntry } from '../../src/hooks/useCalendarEntries';

LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

type MarkedDates = NonNullable<CalendarProps['markedDates']>;

const ENTRY_COLOR = '#40c463';
const SUNDAY_COLOR = '#e53e3e';
const SATURDAY_COLOR = '#3182ce';
const SELECTED_COLOR = '#4A90E2';
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

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
  const dow = DOW_JA[d.getDay()];
  const day = d.getDate();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const isSunday = d.getDay() === 0;
  const isSaturday = d.getDay() === 6;
  const dowColor = isSunday ? SUNDAY_COLOR : isSaturday ? SATURDAY_COLOR : SELECTED_COLOR;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <Text style={[styles.cardDow, { color: dowColor }]}>{dow}</Text>
        <Text style={[styles.cardDay, { color: dowColor }]}>{day}</Text>
        <Text style={[styles.cardTime, { color: dowColor }]}>{time}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardBody} numberOfLines={3}>
          {entry.diary_text || '（内容なし）'}
        </Text>
      </View>
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

  const displayMonthStr = toMonthKey(displayMonth.year, displayMonth.month);
  const { entriesByDate, loading, refetch } = useCalendarEntries(displayMonthStr);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const prevMonth = useCallback(() => {
    setDisplayMonth((prev) => {
      const d = new Date(prev.year, prev.month - 2, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setDisplayMonth((prev) => {
      const d = new Date(prev.year, prev.month, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }, []);

  const entryMarks = Object.keys(entriesByDate).reduce<MarkedDates>((acc, date) => {
    acc[date] = {
      customStyles: {
        container: { backgroundColor: ENTRY_COLOR, borderRadius: 4 },
        text: { color: '#fff', fontWeight: '600' },
      },
    };
    return acc;
  }, {} as MarkedDates);

  const selectedMark: MarkedDates = !entryMarks[selectedDate]
    ? {
        [selectedDate]: {
          customStyles: {
            container: {
              backgroundColor: SELECTED_COLOR,
              borderRadius: 20,
              width: 34,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
            },
            text: { color: '#fff', fontWeight: '600' },
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
      {/* カスタムヘッダー */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrowBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={SELECTED_COLOR} />
        </TouchableOpacity>
        <View style={styles.monthPill}>
          <Text style={styles.monthPillText}>
            {displayMonth.year}年{displayMonth.month}月
          </Text>
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.arrowBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={SELECTED_COLOR} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={ENTRY_COLOR} style={styles.loader} />
      ) : (
        <>
          {/* Calendar（ヘッダーを非表示、曜日行 + 日付グリッドのみ） */}
          <Calendar
            key={displayMonthStr}
            current={`${displayMonthStr}-01`}
            hideArrows
            renderHeader={() => <View />}
            markingType="custom"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            theme={
              {
                textSectionTitleColor: '#555',
                'stylesheet.calendar.header': {
                  header: { height: 0, overflow: 'hidden', marginTop: 0 },
                  week: {
                    marginTop: 0,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    backgroundColor: '#FFF9C4',
                  },
                },
              } as object
            }
          />

          {/* 選択日バナー */}
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{formatBanner(selectedDate)}</Text>
          </View>

          {/* エントリーリスト */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {selectedEntries.length === 0 ? (
              <Text style={styles.emptyText}>この日は記録がありません</Text>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1 },

  // カスタムヘッダー
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  arrowBtn: { padding: 4 },
  monthPill: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 8,
  },
  monthPillText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },

  // 日付バナー
  banner: {
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0d080',
  },
  bannerText: { fontSize: 13, color: '#555', fontWeight: '500' },

  // エントリーリスト
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 24 },

  // エントリーカード
  card: {
    flexDirection: 'row',
    backgroundColor: '#EEF6FF',
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  cardLeft: { alignItems: 'center', minWidth: 36 },
  cardDow: { fontSize: 11, fontWeight: '500' },
  cardDay: { fontSize: 24, fontWeight: '700', lineHeight: 28 },
  cardTime: { fontSize: 11, marginTop: 2 },
  cardRight: { flex: 1, justifyContent: 'center' },
  cardBody: { fontSize: 14, color: '#333', lineHeight: 20 },
});
