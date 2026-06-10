import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.screenTitle}>設定</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>アカウント</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>メールアドレス</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{email ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>アプリについて</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>バージョン</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  rowValue: {
    fontSize: 16,
    color: '#888',
    maxWidth: '55%',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginLeft: 16,
  },
  logoutRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 16,
    color: '#E53935',
  },
});
