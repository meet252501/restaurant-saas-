import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  TouchableOpacity, Animated, Easing, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { trpc } from '../lib/trpc';
import { processIntent } from '../lib/intentEngine';
import { useRouter } from 'expo-router';
import { useSaaSStore } from '../lib/saas-store';
import { useDynamicTheme } from '../lib/useDynamicTheme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "How many bookings today?",
  "What is today's revenue?",
  "Is it busy right now?",
  "Show me cancelled bookings",
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
  const [isLocalMode, setIsLocalMode] = useState(true);
  const router = useRouter();
  const theme = useDynamicTheme();
  const activeModel = useSaaSStore(s => s.activeModel);
  const restaurantId = useSaaSStore(s => s.user?.restaurantId || 'res_default');
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading]);

  const { data: bookings } = trpc.booking.listByDate.useQuery({ date: new Date().toISOString().split('T')[0] });
  const { data: tables } = trpc.table.listByRestaurant.useQuery(undefined);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const aiMsg: Message = { id: `a${Date.now()}`, role: 'assistant', text: data.response, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err) => {
      const aiMsg: Message = { id: `a${Date.now()}`, role: 'assistant', text: `Error: ${err.message}`, timestamp: new Date() };
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
      setTimeout(() => {
        const responseText = processIntent(text.trim(), { bookings, tables });
        const aiMsg: Message = { id: `a${Date.now()}`, role: 'assistant', text: responseText, timestamp: new Date() };
        setMessages(prev => [...prev, aiMsg]);
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }, 1000);
    } else {
      chatMutation.mutate({ restaurantId, message: text.trim(), model: activeModel });
    }
  };

  return (
    <View style={styles.safe}>
      <LinearGradient colors={['#020617', '#0f172a', '#1e1b4b']} style={StyleSheet.absoluteFill} />
      
      {/* Dynamic Glow Orbs */}
      <View style={[styles.glowOrb, { top: -50, right: -50, backgroundColor: theme.primary + '30', width: 300, height: 300 }]} />
      <View style={[styles.glowOrb, { bottom: 100, left: -100, backgroundColor: Colors.accentPurple + '15', width: 400, height: 400 }]} />

      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.statusText, { color: theme.primary }]}>CORE SYSTEM ONLINE</Text>
            </View>
            <Text style={styles.headerTitle}>Smart Assistant</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setIsLocalMode(!isLocalMode)}>
            <Ionicons name={isLocalMode ? "flash-outline" : "cloud-done-outline"} size={20} color={isLocalMode ? theme.primary : Colors.accentPurple} />
          </TouchableOpacity>
        </View>

        {/* Quantum Core Visual */}
        <View style={styles.quantumContainer}>
          <Animated.View style={[styles.quantumLayer as any, { borderColor: theme.primary + '40', transform: [{ scale: pulseAnim }, { rotate: '45deg' }] } as any]} />
          <Animated.View style={[styles.quantumLayer as any, { borderColor: Colors.accentPurple + '30', transform: [{ scale: pulseAnim }, { rotate: '-45deg' }] } as any]} />
          <View style={[styles.quantumInner, { backgroundColor: theme.primary }]}>
             <Ionicons name="sparkles" size={24} color="#000" />
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} theme={theme} />
            ))}

            {loading && (
              <View style={styles.thinkingContainer}>
                <Animated.View style={[styles.thinkingDot, { backgroundColor: theme.primary, transform: [{ scale: pulseAnim }] }]} />
                <Text style={[styles.thinkingText, { color: theme.primary }]}>AI is analyzing data...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {messages.length <= 2 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow} style={styles.quickScroll}>
                {QUICK_QUESTIONS.map(q => (
                  <TouchableOpacity key={q} style={[styles.quickChip, { borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => sendMessage(q)}>
                    <Text style={styles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.inputBar}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  maxLength={500}
                />
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.primary }, (!input.trim() || loading) && styles.sendBtnDisabled]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || loading}
              >
                <Ionicons name="send" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function MessageBubble({ message, theme }: { message: Message, theme: any }) {
  const isUser = message.role === 'user';
  const parts = message.text.split(/\*\*(.*?)\*\*/g);

  return (
    <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="sparkles" size={14} color={theme.primary} />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : [styles.aiBubble, { borderColor: theme.primary + '20' }],
        !isUser && { maxWidth: SCREEN_WIDTH > 600 ? 500 : SCREEN_WIDTH * 0.7 } 
      ]}>
        <Text style={isUser ? styles.userText : styles.aiText}>
          {parts.map((part, i) =>
            i % 2 === 1
              ? <Text key={i} style={{ fontWeight: 'bold', color: isUser ? '#fff' : theme.primary }}>{part}</Text>
              : <Text key={i}>{part}</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  flex: { flex: 1 },
  glowOrb: { position: 'absolute', borderRadius: 200, opacity: 0.4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitleContainer: { alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, ...Shadows.neon },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  messages: { flex: 1, maxWidth: 800, alignSelf: 'center', width: '100%' },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  userWrapper: { alignSelf: 'flex-end' },
  aiWrapper: { alignSelf: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bubble: { padding: 14, borderRadius: 20, borderWidth: 1 },
  userBubble: { backgroundColor: Colors.accentPurple, borderColor: 'rgba(255,255,255,0.1)', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderBottomLeftRadius: 4 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  aiText: { color: '#e2e8f0', fontSize: 15, lineHeight: 22 },
  thinkingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 42 },
  thinkingDot: { width: 8, height: 8, borderRadius: 4 },
  thinkingText: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
  footer: { paddingBottom: 10, maxWidth: 800, alignSelf: 'center', width: '100%' },
  quickScroll: { marginBottom: 12 },
  quickRow: { paddingHorizontal: 20, gap: 10 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
  quickChipText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  inputWrapper: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 24, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  textInput: { color: '#fff', fontSize: 15, maxHeight: 100, paddingVertical: 12 },
  sendBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', ...Shadows.neon },
  sendBtnDisabled: { backgroundColor: '#334155', opacity: 0.5 },
  quantumContainer: { height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: -20 },
  quantumLayer: { position: 'absolute', width: 80, height: 80, borderRadius: 30, borderWidth: 2 },
  quantumInner: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...Shadows.neon },
});
