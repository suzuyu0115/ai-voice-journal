import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import { useJournalChat } from '../../src/hooks/useJournalChat';
import { RecordButton } from '../../src/components/RecordButton';
import { ChatBubble } from '../../src/components/ChatBubble';
import { useJournalStore } from '../../src/store/journalStore';

export default function ConversationScreen() {
  const router = useRouter();
  const { setPendingMessages } = useJournalStore();
  const { isRecording, transcript, interimTranscript, startRecording, stopRecording } = useVoiceRecorder();
  const { messages, isLoading, errorMessage, isConversationComplete, sendUserMessage } = useJournalChat();
  const [textInput, setTextInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const waitingForTranscriptRef = useRef(false);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    if (isConversationComplete) {
      setPendingMessages(messages);
      router.replace('/summary/new');
    }
  }, [isConversationComplete, router, messages, setPendingMessages]);

  useEffect(() => {
    if (!isRecording && waitingForTranscriptRef.current) {
      waitingForTranscriptRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (transcript) setTextInput(transcript);
    }
  }, [isRecording, transcript]);

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      waitingForTranscriptRef.current = true;
      stopRecording();
    } else {
      setTextInput('');
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleTextSend = async () => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    await sendUserMessage(text);
  };

  const handleSummarize = () => {
    router.push('/summary/new');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>今日の日記</Text>
          {messages.length >= 2 && (
            <TouchableOpacity onPress={handleSummarize} style={styles.summarizeButton}>
              <Text style={styles.summarizeText}>まとめる</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.chatList}
          style={styles.chatArea}
        />

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>エラー: {errorMessage}</Text>
          </View>
        )}

        {(interimTranscript || isRecording) && (
          <View style={styles.interimContainer}>
            <Text style={styles.interimText}>
              {interimTranscript || '聞いています...'}
            </Text>
          </View>
        )}

        <View style={styles.textRow}>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="テキストで入力..."
            placeholderTextColor="#bbb"
            returnKeyType="send"
            onSubmitEditing={handleTextSend}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!textInput.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleTextSend}
            disabled={!textInput.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>送信</Text>
          </TouchableOpacity>
        </View>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoid: { flex: 1 },
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
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#F8F9FA',
  },
  sendButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  footer: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  hint: { fontSize: 13, color: '#aaa' },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  errorText: { color: '#CC0000', fontSize: 13 },
});
