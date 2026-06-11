import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSummary } from '../../src/hooks/useSummary';

const EMOTION_LEVELS = [
  { min: 1, max: 2, emoji: '😞', label: 'つらい', color: '#E53935' },
  { min: 3, max: 4, emoji: '😔', label: 'しんどい', color: '#FF7043' },
  { min: 5, max: 6, emoji: '😐', label: 'ふつう', color: '#FFA726' },
  { min: 7, max: 8, emoji: '🙂', label: 'よかった', color: '#66BB6A' },
  { min: 9, max: 10, emoji: '😊', label: 'とてもよかった', color: '#26A69A' },
] as const;

function getEmotionLevel(score: number) {
  return EMOTION_LEVELS.find((l) => score >= l.min && score <= l.max) ?? EMOTION_LEVELS[2];
}

function EmotionBar({ score }: { score: number }) {
  const level = getEmotionLevel(score);
  const fillPercent = ((score - 1) / 9) * 100;

  return (
    <View style={styles.emotionSection}>
      <View style={styles.emotionHeader}>
        <Text style={styles.emotionEmoji}>{level.emoji}</Text>
        <View>
          <Text style={styles.emotionLabel}>{level.label}</Text>
          <Text style={styles.emotionScore}>{score} / 10</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${fillPercent}%` as `${number}%`, backgroundColor: level.color }]} />
      </View>
    </View>
  );
}

export default function SummaryScreen() {
  const router = useRouter();
  const { summary, emotionScore, isGenerating, isSaving, error, saveEntry } = useSummary();

  const handleSave = async () => {
    const id = await saveEntry();
    if (id !== null) {
      router.replace('/');
    }
  };

  if (isGenerating) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.generatingText}>日記をまとめています...</Text>
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>エラーが発生しました</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>ホームへ戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.dateLabel}>
        {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
      </Text>

      <Text style={styles.sectionTitle}>今日の日記</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>

      <Text style={styles.sectionTitle}>気持ちのスコア</Text>
      <View style={styles.emotionCard}>
        <EmotionBar score={emotionScore} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>保存に失敗しました: {error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, isSaving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>保存してホームへ</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.discardButton} onPress={() => router.replace('/')}>
        <Text style={styles.discardText}>保存せずに戻る</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8f9fa' },
  generatingText: { marginTop: 16, fontSize: 16, color: '#666' },
  dateLabel: { fontSize: 13, color: '#999', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', letterSpacing: 0.5, marginBottom: 8, marginTop: 20 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryText: { fontSize: 16, lineHeight: 26, color: '#1a1a1a' },
  emotionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emotionSection: { gap: 12 },
  emotionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emotionEmoji: { fontSize: 36 },
  emotionLabel: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  emotionScore: { fontSize: 13, color: '#999', marginTop: 2 },
  barTrack: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  errorBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  errorBannerText: { color: '#CC0000', fontSize: 13 },
  errorText: { fontSize: 18, fontWeight: '600', color: '#CC0000', marginBottom: 8 },
  errorDetail: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  button: {
    marginTop: 32,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#aaa' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  discardButton: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  discardText: { color: '#999', fontSize: 15 },
});
