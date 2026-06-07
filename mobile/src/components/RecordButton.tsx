import { TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { useEffect, useState } from 'react';

type Props = {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function RecordButton({ isRecording, onPress, disabled }: Props) {
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [isRecording, pulse]);

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8}>
      <Animated.View style={[styles.outer, isRecording && styles.outerActive, { transform: [{ scale: pulse }] }]}>
        <View style={[styles.inner, isRecording && styles.innerActive]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerActive: {
    backgroundColor: '#FCE8E9',
  },
  inner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4A90E2',
  },
  innerActive: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    width: 36,
    height: 36,
  },
});
