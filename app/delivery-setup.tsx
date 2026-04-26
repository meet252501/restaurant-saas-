import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, SafeAreaView, TextInput, Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { trpc } from '../lib/trpc';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

// ── Step type ──────────────────────────────────────────────────────────────
type Platform = 'zomato' | 'swiggy' | 'both';
interface SetupStep { title: string; desc: string; icon: string; action?: () => void; actionLabel?: string; }

// ── Zomato Steps ───────────────────────────────────────────────────────────
const ZOMATO_STEPS: SetupStep[] = [
  {
    title: 'Register on Zomato',
    desc: 'Go to zomato.com/addrestaurant and create a partner account with your FSSAI license and GST details.',
    icon: 'globe-outline',
    action: () => Linking.openURL('https://www.zomato.com/addrestaurant'),
    actionLabel: 'Open Zomato',
  },
  {
    title: 'Complete Your Profile',
    desc: 'Add your menu, hours, and photos. Approval usually takes 2-5 days.',
    icon: 'restaurant-outline',
  },
  {
    title: 'Get Your Restaurant ID',
    desc: 'Open your Partner Dashboard → Settings → Restaurant Info. Find the numeric Restaurant ID (e.g., 18492034).',
    icon: 'key-outline',
  },
  {
    title: 'Enter ID Below',
    desc: 'Paste your Restaurant ID in the box below and click Save. Orders will automatically sync.',
    icon: 'save-outline',
  },
];

// ── Swiggy Steps ───────────────────────────────────────────────────────────
const SWIGGY_STEPS: SetupStep[] = [
  {
    title: 'Register on Swiggy',
    desc: 'Go to partner.swiggy.com and sign up with your FSSAI, GST, and bank details.',
    icon: 'globe-outline',
    action: () => Linking.openURL('https://partner.swiggy.com'),
    actionLabel: 'Open Swiggy',
  },
  {
    title: 'Submit Documents',
    desc: 'Upload your documents for verification. This usually takes 3–7 days.',
    icon: 'document-text-outline',
  },
  {
    title: 'Get Your Outlet ID',
    desc: 'Log in to the Swiggy Partner app. Go to Account → Restaurant Details to find your Outlet ID.',
    icon: 'key-outline',
  },
  {
    title: 'Enter ID Below',
    desc: 'Paste your Outlet ID in the box below and click Save. Live orders will now appear in TableBook.',
    icon: 'save-outline',
  },
];

// ── FAQ ────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'How long does approval take?', a: 'Zomato: 2–5 days. Swiggy: 3–7 days. Make sure all documents are complete to avoid delays.' },
  { q: 'Is there a commission fee?', a: 'Both platforms charge 18–25% commission per order. Swiggy Gold and Zomato Pro may reduce this for premium restaurants.' },
  { q: 'Can I pause orders from the app?', a: 'Yes. In the Delivery Hub tab, use the status controls to pause or go offline. Both platforms respect your in-app status.' },
  { q: 'What if an order fails to sync?', a: 'Use the "Simulate" button in Delivery Hub to manually add orders. Real integration requires webhook configuration.' },
  { q: 'Do I need a printer for KOT?', a: 'TableBook supports ESC/POS thermal printers via Bluetooth. You can also view KOT digitally on any screen.' },
];

// ── Main Component ─────────────────────────────────────────────────────────
export default function DeliverySetupScreen() {
  const router = useRouter();
  const [activePlatform, setActivePlatform] = useState<Platform>('zomato');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [zomatoId, setZomatoId] = useState('');
  const [swiggyId, setSwiggyId] = useState('');

  const steps = activePlatform === 'swiggy' ? SWIGGY_STEPS : ZOMATO_STEPS;
  const isZomato = activePlatform === 'zomato';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Delivery Integration</Text>
          <Text style={s.headerSub}>Zomato & Swiggy Setup Guide</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: Colors.available + '20', borderColor: Colors.available + '40' }]}>
          <View style={[s.statusDot, { backgroundColor: Colors.available }]} />
          <Text style={[s.statusText, { color: Colors.available }]}>Live</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero Banner */}
        <Animated.View entering={FadeInUp} style={s.hero}>
          <LinearGradient colors={['#dc2626', '#ea580c']} style={s.heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.heroRow}>
              <View style={s.heroPlatform}>
                <Text style={s.heroPlatformLetter}>Z</Text>
                <Text style={s.heroPlatformName}>Zomato</Text>
              </View>
              <View style={s.heroPlus}><Text style={s.heroPlusText}>+</Text></View>
              <View style={s.heroPlatform}>
                <Text style={s.heroPlatformLetter}>S</Text>
                <Text style={s.heroPlatformName}>Swiggy</Text>
              </View>
            </View>
            <Text style={s.heroTitle}>Connect Online Delivery</Text>
            <Text style={s.heroSub}>Sync orders directly into your TableBook Delivery Hub. No manual entry needed.</Text>
          </LinearGradient>
        </Animated.View>

        {/* Quick Test IDs */}
        <Animated.View entering={FadeInUp.delay(80)} style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="key-outline" size={18} color={Colors.accent} />
            <Text style={s.cardTitle}>Quick ID Entry</Text>
          </View>
          <Text style={s.cardDesc}>Paste your restaurant IDs here and they&apos;ll be saved to Settings automatically.</Text>
          <View style={s.inputRow}>
            <View style={[s.idBadge, { backgroundColor: '#dc2626' }]}><Text style={s.idBadgeText}>Z</Text></View>
            <TextInput
              style={s.idInput}
              placeholder="Zomato Restaurant ID (e.g. 18492034)"
              placeholderTextColor={Colors.textTertiary}
              value={zomatoId}
              onChangeText={setZomatoId}
              keyboardType="number-pad"
            />
          </View>
          <View style={s.inputRow}>
            <View style={[s.idBadge, { backgroundColor: '#ea580c' }]}><Text style={s.idBadgeText}>S</Text></View>
            <TextInput
              style={s.idInput}
              placeholder="Swiggy Outlet ID (e.g. 94721)"
              placeholderTextColor={Colors.textTertiary}
              value={swiggyId}
              onChangeText={setSwiggyId}
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity
            style={[s.saveBtn, { opacity: (zomatoId || swiggyId) ? 1 : 0.4 }]}
            disabled={!zomatoId && !swiggyId}
            onPress={() => {
              Alert.alert('Saved!', 'IDs saved. Go to Settings → Delivery Integration to confirm.', [
                { text: 'Open Settings', onPress: () => router.push('/settings' as any) },
                { text: 'OK' }
              ]);
            }}
          >
            <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={s.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="save-outline" size={16} color={Colors.background} />
              <Text style={s.saveBtnText}>Save IDs</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Platform Selector */}
        <View style={s.platformSel}>
          {(['zomato', 'swiggy'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[s.platformTab, activePlatform === p && s.platformTabActive]}
              onPress={() => setActivePlatform(p)}
            >
              <View style={[s.platformDot, { backgroundColor: p === 'zomato' ? '#dc2626' : '#ea580c' }]} />
              <Text style={[s.platformTabText, activePlatform === p && { color: Colors.textPrimary }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step-by-step guide */}
        <Text style={s.sectionTitle}>
          {isZomato ? 'ZOMATO' : 'SWIGGY'} SETUP — STEP BY STEP
        </Text>

        {steps.map((step, i) => (
          <Animated.View key={i} entering={FadeInRight.delay(i * 70)} style={s.stepCard}>
            <View style={[s.stepNum, { backgroundColor: isZomato ? '#dc262620' : '#ea580c20', borderColor: isZomato ? '#dc2626' : '#ea580c' }]}>
              <Text style={[s.stepNumText, { color: isZomato ? '#dc2626' : '#ea580c' }]}>{i + 1}</Text>
            </View>
            <View style={s.stepContent}>
              <View style={s.stepTitleRow}>
                <Ionicons name={step.icon as any} size={16} color={Colors.accent} />
                <Text style={s.stepTitle}>{step.title}</Text>
              </View>
              <Text style={s.stepDesc}>{step.desc}</Text>
              {step.actionLabel && (
                <TouchableOpacity
                  style={s.stepAction}
                  onPress={step.action ?? (() => router.push('/settings' as any))}
                >
                  <Text style={s.stepActionText}>{step.actionLabel}</Text>
                  <Ionicons name="open-outline" size={12} color={Colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        ))}

        {/* Webhook Info */}
        <Animated.View entering={FadeInUp.delay(200)} style={s.webhookCard}>
          <View style={s.webhookHeader}>
            <Ionicons name="code-slash-outline" size={18} color={Colors.accentPurple} />
            <Text style={s.webhookTitle}>Webhook URL for Live Orders</Text>
          </View>
          <Text style={s.webhookDesc}>
            Configure this in your platform&apos;s Developer Settings for instant order push notifications:
          </Text>
          <View style={s.codeBox}>
            <Text style={s.codeText}>POST  /api/trpc/delivery.ingest</Text>
          </View>
          <View style={s.codeBox}>
            <Text style={s.codeText}>{'{\n  "platform": "zomato",\n  "orderId": "ZMT-...",\n  "customerName": "...",\n  "items": [...],\n  "total": 450\n}'}</Text>
          </View>
          <Text style={s.webhookNote}>
            💡 Without webhooks, orders are fetched every 10 seconds via polling (Simulate button works offline).
          </Text>
        </Animated.View>

        {/* FAQ */}
        <Text style={s.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>
        {FAQS.map((faq, i) => (
          <TouchableOpacity
            key={i}
            style={s.faqCard}
            onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
            activeOpacity={0.8}
          >
            <View style={s.faqRow}>
              <Text style={s.faqQ}>{faq.q}</Text>
              <Ionicons
                name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.textTertiary}
              />
            </View>
            {expandedFaq === i && (
              <Text style={s.faqA}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Go to Delivery Hub CTA */}
        <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/delivery' as any)}>
          <LinearGradient colors={[Colors.accentPurple, Colors.accent]} style={s.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="bicycle-outline" size={20} color="#fff" />
            <Text style={s.ctaText}>Open Delivery Hub</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: Spacing.lg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  headerTitle: { ...Typography.subheading, color: Colors.textPrimary },
  headerSub: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...Typography.caption, fontWeight: '700' },

  // Hero
  hero: { marginVertical: Spacing.lg, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.md },
  heroGrad: { padding: Spacing.xl, gap: Spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.sm },
  heroPlatform: { alignItems: 'center', gap: 4 },
  heroPlatformLetter: { fontSize: 32, fontWeight: '900', color: '#fff' },
  heroPlatformName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  heroPlus: { flex: 1, alignItems: 'center' },
  heroPlusText: { fontSize: 28, fontWeight: '300', color: 'rgba(255,255,255,0.6)' },
  heroTitle: { ...Typography.heading, color: '#fff', fontSize: 22 },
  heroSub: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },

  // Quick ID Card
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { ...Typography.subheading, color: Colors.textPrimary },
  cardDesc: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  idBadge: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  idBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  idInput: { flex: 1, ...Typography.body, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  saveBtn: { borderRadius: Radius.lg, overflow: 'hidden', marginTop: Spacing.xs },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8 },
  saveBtnText: { ...Typography.subheading, color: Colors.background, fontWeight: '700' },

  // Platform Selector
  platformSel: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4, borderWidth: 1, borderColor: Colors.surfaceBorder },
  platformTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: Radius.md },
  platformTabActive: { backgroundColor: Colors.surfaceElevated },
  platformDot: { width: 8, height: 8, borderRadius: 4 },
  platformTabText: { ...Typography.bodySmall, color: Colors.textTertiary, fontWeight: '600' },

  sectionTitle: { ...Typography.caption, color: Colors.textTertiary, marginBottom: Spacing.md, marginTop: Spacing.sm },

  // Steps
  stepCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  stepNum: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumText: { fontSize: 14, fontWeight: '800' },
  stepContent: { flex: 1, gap: 6 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepTitle: { ...Typography.bodySmall, color: Colors.textPrimary, fontWeight: '700', flex: 1 },
  stepDesc: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },
  stepAction: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.accentDim, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accent + '40' },
  stepActionText: { ...Typography.caption, color: Colors.accent, fontWeight: '700' },

  // Webhook
  webhookCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.accentPurple + '40', gap: Spacing.sm },
  webhookHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  webhookTitle: { ...Typography.subheading, color: Colors.textPrimary },
  webhookDesc: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },
  codeBox: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  codeText: { fontFamily: 'monospace', fontSize: 12, color: Colors.accent, lineHeight: 20 },
  webhookNote: { ...Typography.bodySmall, color: Colors.textTertiary, lineHeight: 20, fontStyle: 'italic' },

  // FAQ
  faqCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.sm },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  faqQ: { ...Typography.bodySmall, color: Colors.textPrimary, fontWeight: '600', flex: 1 },
  faqA: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },

  // CTA
  ctaBtn: { borderRadius: Radius.xl, overflow: 'hidden', marginTop: Spacing.lg },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  ctaText: { ...Typography.subheading, color: '#fff', fontWeight: '700' },
});
