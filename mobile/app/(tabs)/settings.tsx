import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, RADIUS } from '../../src/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

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
      <View style={[styles.rowIconWrapper, destructive && styles.rowIconWrapperDestructive]}>
        <Ionicons name={icon} size={18} color={destructive ? COLORS.error : COLORS.primary} />
      </View>
      <Text style={[styles.rowLabel, destructive && styles.destructiveLabel]}>{label}</Text>
      {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={15} color={COLORS.textTertiary} />}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingVertical: 16, paddingBottom: 40 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 6,
  },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginHorizontal: 16,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 52,
    gap: 12,
  },
  rowIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconWrapperDestructive: {
    backgroundColor: '#FEE2E2',
  },
  rowLabel: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  destructiveLabel: { color: COLORS.error },
  rowValue: { fontSize: 15, color: COLORS.textSecondary, marginRight: 4 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 60,
  },
});
