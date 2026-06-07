import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '日記一覧' }} />
      <Stack.Screen name="conversation" options={{ title: '会話', headerBackTitle: '戻る' }} />
      <Stack.Screen name="summary/[id]" options={{ title: 'サマリー', headerBackTitle: '戻る' }} />
    </Stack>
  );
}
