import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../src/lib/supabase';

export default function RootLayout() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) supabase.auth.signInAnonymously();
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="summary/[id]" options={{ title: 'サマリー', headerBackVisible: false, headerBackTitle: '', headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}
