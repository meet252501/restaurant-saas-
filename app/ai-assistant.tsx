import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { trpc, RESTAURANT_ID } from '../lib/trpc';
import { localAI } from '../lib/LocalAIService';
import { processIntent } from '../lib/intentEngine';
import { useRouter } from 'expo-router';
import { useSaaSStore } from '../lib/saas-store';
import { useDynamicTheme } from '../lib/useDynamicTheme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  actionLink?: string;
}

const QUICK_QUESTIONS = [
  "How many bookings today?",
  "What is today's revenue?",
  "Is it busy right now?",
  "How many cancellations?",
];

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "👋 Hi! I'm your **TableBook Smart Assistant**.\n\nAsk me about:\n• Today's bookings & covers\n• Table occupancy & availability\n• Revenue & no-show stats\n\nTap a quick question or type anything below.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(true); // Default to our new fast local mode
  const router = useRouter();
  const theme = useDynamicTheme();
  const activeModel = useSaaSStore(s => s.activeModel);
  const scrollRef = useRef<ScrollView>(null);

  // Fetch contextual floor data for the Smart Engine
  const { data: bookings } = trpc.booking.listByDate.useQuery({ date: new Date().toISOString().split('T')[0] });
  const { data: tables } = trpc.table.listByRestaurant.useQuery(undefined);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const aiMsg: Message = {
        id: `a${Date.now()}`,
        role: 'assistant',
        text: data.response,
        timestamp: new Date(),
        actionLink: (data as any).actionLink,
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err) => {
      const aiMsg: Message = {
        id: `a${Date.now()}`,
        role: 'assistant',
        text: `Sorry, I couldn't process that right now. Error: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    },
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    if (isLocalMode) {
      // Layer-by-Layer Smart Intent Matcher (Instant, 0 RAM)
      setTimeout(() => {
        const responseText = processIntent(text.trim(), { bookings, tables });
        const aiMsg: Message = {
          id: `a${Date.now()}`,
          role: 'assistant',
          text: responseText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }, 500); // Small fake delay for realistic "thinking" feel
    } else {
      chatMutation.mutate({ restaurantId: RESTAURANT_ID, message: text.trim(), model: activeModel });
    }
  };

  const MessageBubbleWrapper = ({ message }: { message: Message }) => {
    return <MessageBubble message={message} theme={theme} />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <MessageBubbleWrapper key={msg.id} message={msg} />
          ))}

          {loading && (
            <View style={styles.thinkingBubble}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.thinkingText, { color: theme.primary }]}>Analyzing live data...</Text>
            </View>
          )}
        </ScrollView>

        {/* Quick questions */}
        {messages.length <= 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow} style={{ flexGrow: 0 }}>
            {QUICK_QUESTIONS.map(q => (
              <Pressable key={q} style={[styles.quickChip, { backgroundColor: theme.primaryDim, borderColor: theme.primary + '40' }]} onPress={() => sendMessage(q)}>
                <Text style={[styles.quickChipText, { color: theme.primary }]}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* RAG & Mode Indicator */}
        <View style={styles.ragBadge}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.ragDot, isLocalMode && { backgroundColor: theme.primary }]} />
            <Text style={styles.ragText}>
              {isLocalMode ? 'Offline Mode · On-Device Inference' : 'Cloud Mode · Connected to Server'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => setIsLocalMode(!isLocalMode)}
            style={{ backgroundColor: isLocalMode ? theme.primaryDim : '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: isLocalMode ? theme.primary : Colors.textSecondary }}>
              {isLocalMode ? 'SWITCH TO CLOUD' : 'GO OFFLINE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your restaurant..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: theme.primary }, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color="#000" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { LinearGradient } from 'expo-linear-gradient';

function MessageBubble({ message, theme }: { message: Message, theme: any }) {
  const isUser = message.role === 'user';
  // Bold markdown-like rendering
  const parts = message.text.split(/\*\*(.*?)\*\*/g);

  const innerText = (
    <>
      <Text style={isUser ? styles.userText : styles.aiText}>
        {parts.map((part, i) =>
          i % 2 === 1
            ? <Text key={i} style={{ fontWeight: '700' }}>{part}</Text>
            : <Text key={i}>{part}</Text>
        )}
      </Text>
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </>
  );

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: theme.primaryDim, borderColor: theme.primary + '40' }]}>
          <Text style={{ fontSize: 14 }}>🤖</Text>
        </View>
      )}
      {isUser ? (
        <View style={[styles.bubbleContent, styles.userContent, { backgroundColor: theme.primaryDim }]}>
          {innerText}
        </View>
      ) : (
        <LinearGradient
          colors={[Colors.surfaceElevated, Colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubbleContent, styles.aiContent, Shadows.glass, { borderColor: theme.primaryDim }]}
        >
          {innerText}
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },
  bubble: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.aiDim,
    borderWidth: 1, borderColor: Colors.ai + '40', alignItems: 'center', justifyContent: 'center',
  },
  bubbleContent: {
    maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md,
    gap: 6, ...Shadows.sm,
  },
  userContent: { borderBottomRightRadius: 4, borderTopRightRadius: Radius.lg },
  aiContent: {
    borderBottomLeftRadius: 4, borderTopLeftRadius: Radius.lg,
    borderWidth: 1,
  },
  userText: { ...Typography.body, color: Colors.textInverse, lineHeight: 22 },
  aiText: { ...Typography.body, color: Colors.textPrimary, lineHeight: 22 },
  timestamp: { ...Typography.caption, color: Colors.textTertiary, alignSelf: 'flex-end' },
  thinkingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  thinkingText: { ...Typography.bodySmall, color: Colors.ai },
  ragBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.lg, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  ragDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  ragText: { ...Typography.caption, color: Colors.textTertiary },
  quickRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  quickChip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  quickChipText: { ...Typography.bodySmall, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceGlass,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg,
    padding: Spacing.md, ...Typography.body, color: Colors.textPrimary,
    maxHeight: 100, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', ...Shadows.accent,
  },
  sendBtnDisabled: { backgroundColor: Colors.surfaceBorder },
});
