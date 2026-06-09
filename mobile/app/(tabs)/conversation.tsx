import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ConversationScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>会話画面（実装予定）</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/summary/1')}
      >
        <Text style={styles.buttonText}>サマリーへ（仮）</Text>
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
