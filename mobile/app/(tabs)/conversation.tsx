import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGeminiLive } from '../../src/hooks/useGeminiLive';
import { useJournalStore } from '../../src/store/journalStore';
import { COLORS, SHADOWS, RADIUS } from '../../src/constants/theme';

const NAVIGATE_DELAY_MS = 2500;

function StreamingDot({ visible }: { visible: boolean }) {
  const [dotAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visible, dotAnim]);
  if (!visible) return null;
  const opacity = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return <Animated.View style={[styles.streamingDot, { opacity }]} />;
}

export default function ConversationScreen() {
  const router = useRouter();
  const { setPendingMessages } = useJournalStore();
  const {
    status,
    displayText,
    conversationLog,
    isConversationComplete,
    isAiSpeaking,
    error,
    inputVolumeLevel,
    outputVolumeLevel,
    start,
    stop,
  } = useGeminiLive();

  // Orb pulse with volume
  const [blobScale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const level = Math.max(inputVolumeLevel, outputVolumeLevel);
    Animated.timing(blobScale, {
      toValue: 1 + level * 0.5,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [inputVolumeLevel, outputVolumeLevel, blobScale]);

  // Idle breathing animation
  const [breathAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (status === 'idle') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(breathAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      breathAnim.setValue(0);
    }
  }, [status, breathAnim]);

  // Navigate after completion
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
  const breathScale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const breathOpacity = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] });
  const breathScale2 = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const breathOpacity2 = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.3] });

  // ── Idle / Connecting state ──────────────────────────────────────
  if (!isActive) {
    return (
      <SafeAreaView style={styles.idleScreen} edges={['left', 'right']}>
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.idleCenter}>
          <View style={styles.orbContainer}>
            <Animated.View style={[styles.breathRing, styles.breathRingOuter, { transform: [{ scale: breathScale }], opacity: breathOpacity }]} />
            <Animated.View style={[styles.breathRing, styles.breathRingMid, { transform: [{ scale: breathScale2 }], opacity: breathOpacity2 }]} />
            <View style={styles.micCore}>
              <Ionicons name="mic" size={36} color="#fff" />
            </View>
          </View>

          <Text style={styles.idleTitle}>AIと話して{'\n'}今日を記録しよう</Text>
          <Text style={styles.idleSubtitle}>話すだけで日記が完成します</Text>

          <TouchableOpacity style={styles.startButton} onPress={start} activeOpacity={0.85}>
            <Ionicons name="mic" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.startButtonText}>会話を始める</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active / Connected state ─────────────────────────────────────
  const orbColor = isAiSpeaking ? COLORS.primary : COLORS.streakOrange;

  return (
    <SafeAreaView style={styles.activeScreen} edges={['left', 'right']}>
      {/* Header */}
      <View style={styles.activeHeader}>
        <Text style={styles.activeHeaderTitle}>会話中</Text>
        {!isConversationComplete && (
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} accessibilityLabel="まとめる">
            <Ionicons name="checkmark" size={18} color={COLORS.primary} />
            <Text style={styles.closeBtnText}>まとめる</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* AI response text area */}
      <View style={styles.textArea}>
        {status === 'connecting' ? (
          <View style={styles.connectingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.connectingText}>AIに接続中...</Text>
          </View>
        ) : isConversationComplete ? (
          <View style={styles.completeBanner}>
            <Text style={styles.completeBannerText}>✨ 日記を作成しています...</Text>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 6 }} />
          </View>
        ) : (
          <>
            <Text style={styles.aiResponseText}>{displayText}</Text>
            <StreamingDot visible={isAiSpeaking} />
          </>
        )}
      </View>

      {/* Orb footer */}
      <View style={styles.activeFooter}>
        {status === 'connecting' ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <View style={styles.orbWrapper}>
            <Animated.View
              style={[
                styles.orbGlow,
                { backgroundColor: orbColor, transform: [{ scale: blobScale }] },
              ]}
            />
            <View style={[styles.orbCore, { backgroundColor: orbColor }]}>
              <Ionicons
                name={isAiSpeaking ? 'volume-medium' : 'mic'}
                size={26}
                color="#fff"
              />
            </View>
          </View>
        )}
        <Text style={styles.statusHint}>
          {isAiSpeaking ? 'AIが話しています' : '話しかけてください'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const ORB_SIZE = 72;
const GLOW_SIZE = 96;
const CORE_SIZE = 80;
const RING_MID = 110;
const RING_OUTER = 140;

const styles = StyleSheet.create({
  // ── Idle ──
  idleScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  idleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 0,
  },
  orbContainer: {
    width: RING_OUTER,
    height: RING_OUTER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  breathRing: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  breathRingOuter: {
    width: RING_OUTER,
    height: RING_OUTER,
  },
  breathRingMid: {
    width: RING_MID,
    height: RING_MID,
  },
  micCore: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  idleTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 10,
  },
  idleSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    ...SHADOWS.md,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  // ── Active ──
  activeScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  activeHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // AI response text area
  textArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  aiResponseText: {
    fontSize: 20,
    lineHeight: 32,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  streamingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Connecting / Complete states
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  connectingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  completeBanner: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  completeBannerText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Footer orb
  activeFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 24,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  orbWrapper: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    opacity: 0.2,
  },
  orbCore: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  statusHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  errorText: { fontSize: 13, color: COLORS.error, flex: 1 },
});
