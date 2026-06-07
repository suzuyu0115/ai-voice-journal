import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useVoiceRecorder } from '../src/hooks/useVoiceRecorder';
import { useJournalChat } from '../src/hooks/useJournalChat';
import { RecordButton } from '../src/components/RecordButton';
import { ChatBubble } from '../src/components/ChatBubble';

export default function ConversationScreen() {
  const router = useRouter();
  const { isRecording, transcript, interimTranscript, startRecording, stopRecording } = useVoiceRecorder();
  const { messages, isLoading, sendUserMessage } = useJournalChat();

  const handleRecordToggle = async () => {
    if (isRecording) {
      stopRecording();
      if (transcript) {
        await sendUserMessage(transcript);
      }
    } else {
      await startRecording();
    }
  };

  const handleSummarize = () => {
    router.push('/summary/new');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>今日の日記</Text>
        {messages.length >= 2 && (
          <TouchableOpacity onPress={handleSummarize} style={styles.summarizeButton}>
            <Text style={styles.summarizeText}>まとめる</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.chatList}
        style={styles.chatArea}
      />

      {(interimTranscript || isRecording) && (
        <View style={styles.interimContainer}>
          <Text style={styles.interimText}>
            {interimTranscript || '聞いています...'}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#4A90E2" />
        ) : (
          <RecordButton isRecording={isRecording} onPress={handleRecordToggle} />
        )}
        <Text style={styles.hint}>
          {isRecording ? 'もう一度タップで送信' : 'タップして話す'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  summarizeButton: { backgroundColor: '#4A90E2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  summarizeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  chatArea: { flex: 1 },
  chatList: { paddingVertical: 12 },
  interimContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  interimText: { color: '#888', fontSize: 15, fontStyle: 'italic' },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  hint: { fontSize: 13, color: '#aaa' },
});
