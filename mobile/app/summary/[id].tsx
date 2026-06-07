import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>サマリー画面（id: {id}）</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>ホームへ戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholder: { fontSize: 18, color: '#888', marginBottom: 32 },
  button: { backgroundColor: '#4A90E2', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 32 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
