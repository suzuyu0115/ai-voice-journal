import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Voice Journal</Text>
      <Text style={styles.empty}>まだ日記がありません</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/conversation')}
      >
        <Text style={styles.buttonText}>会話を始める</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32 },
  empty: { fontSize: 16, color: '#888', marginBottom: 48 },
  button: { backgroundColor: '#4A90E2', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 32 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
