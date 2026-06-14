import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const PRIMARY = '#4A90E2';
const DESTRUCTIVE = '#e53e3e';
const TEXT = '#1a1a1a';
const SUB = '#888';

function placeholder() {
  Alert.alert('準備中', 'この機能は近日実装予定です。');
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Row({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: IoniconsName;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <Ionicons name={icon} size={20} color={destructive ? DESTRUCTIVE : PRIMARY} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, destructive && styles.destructiveLabel]}>{label}</Text>
      {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={SUB} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="アプリについて" />
      <View style={styles.section}>
        <Row icon="information-circle-outline" label="バージョン" value={version} />
      </View>

      <SectionHeader title="通知" />
      <View style={styles.section}>
        <Row icon="notifications-outline" label="リマインダー通知" onPress={placeholder} />
      </View>

      <SectionHeader title="AI 設定" />
      <View style={styles.section}>
        <Row icon="color-wand-outline" label="AI トーン" onPress={placeholder} />
        <View style={styles.divider} />
        <Row icon="chatbubble-outline" label="日記文体" onPress={placeholder} />
      </View>

      <SectionHeader title="データ" />
      <View style={styles.section}>
        <Row icon="trash-outline" label="全データ削除" onPress={placeholder} destructive />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { paddingVertical: 16 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: SUB,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowIcon: { marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, color: TEXT },
  destructiveLabel: { color: DESTRUCTIVE },
  rowValue: { fontSize: 16, color: SUB, marginRight: 6 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 48,
  },
});
