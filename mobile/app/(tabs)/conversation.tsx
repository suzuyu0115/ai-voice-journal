import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGeminiLive } from '../../src/hooks/useGeminiLive';
import { useJournalStore } from '../../src/store/journalStore';

const NAVIGATE_DELAY_MS = 4000;

export default function ConversationScreen() {
  const router = useRouter();
  const { setPendingMessages } = useJournalStore();
  const {
    status,
    displayText,
    conversationLog,
    isConversationComplete,
    error,
    inputVolumeLevel,
    outputVolumeLevel,
    start,
    stop,
  } = useGeminiLive();

  const [blobScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const level = Math.max(inputVolumeLevel, outputVolumeLevel);
    Animated.timing(blobScale, {
      toValue: 1 + level * 0.6,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [inputVolumeLevel, outputVolumeLevel, blobScale]);

  useEffect(() => {
    if (!isConversationComplete) return;
    const timer = setTimeout(() => {
      stop();
      setPendingMessages(conversationLog);
      router.replace('/summary/new');
    }, NAVIGATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isConversationComplete, conversationLog, stop, setPendingMessages, router]);

  const handleClose = useCallback(() => {
    stop();
    if (conversationLog.length > 0) {
      setPendingMessages(conversationLog);
      router.replace('/summary/new');
    }
  }, [stop, conversationLog, setPendingMessages, router]);

  const isActive = status === 'connecting' || status === 'connected';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>今日の日記</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.displayText}>{displayText}</Text>
      </ScrollView>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.footer}>
        {!isActive ? (
          <TouchableOpacity style={styles.startButton} onPress={start}>
            <Text style={styles.startButtonText}>話を始める</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.controlRow}>
            <View style={styles.controlSpacer} />
            {status === 'connecting' ? (
              <ActivityIndicator size="large" color="#4A90E2" />
            ) : (
              <Animated.View style={[styles.blob, { transform: [{ scale: blobScale }] }]} />
            )}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} accessibilityLabel="会話を終える">
              <Ionicons name="close" size={22} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.hint}>
          {status === 'connecting' ? '接続中...' : status === 'connected' ? '話しかけてください' : 'タップして開始'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#888' },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  displayText: { fontSize: 22, lineHeight: 32, color: '#1a1a1a' },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
  },
  errorText: { color: '#e53e3e', fontSize: 13 },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  startButton: { backgroundColor: '#4A90E2', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  startButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 32 },
  controlSpacer: { width: 44 },
  blob: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#4A90E2',
    marginHorizontal: 32,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 13, color: '#888' },
});
