import { View, Text, StyleSheet } from 'react-native';
import type { Message } from '../lib/gemini';

type Props = { message: Message };

export function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, paddingHorizontal: 16 },
  rowUser: { alignItems: 'flex-end' },
  rowAI: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#4A90E2', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#F1F3F4', borderBottomLeftRadius: 4 },
  text: { fontSize: 16, lineHeight: 22 },
  textUser: { color: '#fff' },
  textAI: { color: '#1a1a1a' },
});
