import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { href: string; label: string; active: IoniconsName; inactive: IoniconsName }[] = [
  { href: '/', label: 'ホーム', active: 'home', inactive: 'home-outline' },
  { href: '/conversation', label: '会話', active: 'mic', inactive: 'mic-outline' },
  { href: '/calendar', label: 'カレンダー', active: 'calendar', inactive: 'calendar-outline' },
  { href: '/settings', label: '設定', active: 'settings', inactive: 'settings-outline' },
];

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(tab => {
        const isActive = pathname === tab.href;
        return (
          <TouchableOpacity
            key={tab.href}
            style={styles.tab}
            onPress={() => router.replace(tab.href as never)}
          >
            <Ionicons
              name={isActive ? tab.active : tab.inactive}
              size={24}
              color={isActive ? '#4A90E2' : '#999'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: { fontSize: 10, color: '#999' },
  labelActive: { color: '#4A90E2' },
});
