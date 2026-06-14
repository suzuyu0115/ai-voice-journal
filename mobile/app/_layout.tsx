import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="summary/[id]" options={{ title: 'サマリー', headerBackVisible: false, headerBackTitle: '', headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}
