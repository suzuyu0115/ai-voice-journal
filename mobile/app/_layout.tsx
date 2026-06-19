import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const FADE_IN_MS = 600;
const HOLD_MS = 1100;
const FADE_OUT_MS = 400;

function AppSplash({ onDone }: { onDone: () => void }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(24));
  const [iconScale] = useState(() => new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: FADE_IN_MS, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 7 }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }).start(() => onDone());
      }, HOLD_MS);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={splash.container} pointerEvents="none">
      <Animated.View style={[splash.content, { opacity, transform: [{ translateY }] }]}>
        <Animated.View style={[splash.iconWrap, { transform: [{ scale: iconScale }] }]}>
          <View style={splash.iconGlow} />
          <Ionicons name="mic" size={52} color="#fff" />
        </Animated.View>
        <Text style={splash.title}>AIダイアリー</Text>
        <Text style={splash.subtitle}>毎日の気づきを、AIと深める</Text>
      </Animated.View>
    </View>
  );
}

export default function RootLayout() {
  const [authDone, setAuthDone] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const doAnon = !session ? supabase.auth.signInAnonymously() : Promise.resolve();
      doAnon.finally(() => {
        setAuthDone(true);
        SplashScreen.hideAsync().catch(() => {});
      });
    });
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="summary/[id]"
          options={{
            title: 'サマリー',
            headerBackVisible: false,
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack>
      {authDone && splashVisible && (
        <AppSplash onDone={() => setSplashVisible(false)} />
      )}
    </>
  );
}

const splash = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconGlow: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ scale: 1.3 }],
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
