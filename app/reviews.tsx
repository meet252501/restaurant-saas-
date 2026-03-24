import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { trpc } from '../lib/trpc';
import { useSaaSStore } from '../lib/saas-store';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= rating ? 'star' : 'star-outline'}
          size={size}
          color={s <= rating ? '#facc15' : Colors.surfaceBorder}
        />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const router = useRouter();
  const appName = useSaaSStore(s => s.appName);
  const [replyingTo, setReplyingTo] = React.useState<any>(null);
  const [replyText, setReplyText]   = React.useState('');

  const { data: reviewsData, isLoading, refetch } = trpc.reviews.list.useQuery();
  const submitReply = trpc.reviews.submitReply.useMutation({
    onSuccess: () => { refetch(); setReplyingTo(null); setReplyText(''); },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingTxt}>Fetching Reviews…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerSub}>Recent Google Reviews for {appName}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Rating Hero */}
        <Animated.View entering={FadeInUp} style={[styles.ratingHero, Shadows.green]}>
          <View style={styles.gCircle}>
            <MaterialCommunityIcons name="google" size={22} color={Colors.accent} />
          </View>
          <Text style={styles.ratingNum}>{reviewsData?.rating ?? '4.6'}</Text>
          <Stars rating={Math.round(reviewsData?.rating ?? 4.6)} size={22} />
          <Text style={styles.ratingCount}>
            {reviewsData?.totalRatings ?? 48} Reviews on Google
          </Text>
          <TouchableOpacity
            style={styles.mapsBtn}
            onPress={() => Linking.openURL('https://www.google.com/search?q=Green+Apple+Restaurant+Gandhinagar+reviews')}
          >
            <MaterialCommunityIcons name="google-maps" size={14} color={Colors.accent} />
            <Text style={styles.mapsBtnTxt}>View on Google Maps</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Reviews */}
        {(reviewsData?.reviews ?? []).map((review: any, index: number) => (
          <Animated.View
            key={index}
            entering={FadeInDown.delay(index * 80)}
            style={[styles.reviewCard, Shadows.sm]}
          >
            {/* Author row */}
            <View style={styles.reviewHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(review.authorName ?? 'G')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{review.authorName}</Text>
                <Text style={styles.timeAgo}>{review.relativeTimeDescription}</Text>
              </View>
              <Stars rating={review.rating} />
            </View>

            {/* Review text */}
            <Text style={styles.reviewText}>{review.text}</Text>

            {/* Reply */}
            {review.isReplied ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>🍏 Owner Response</Text>
                <Text style={styles.replyContent}>{review.replyText}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => setReplyingTo(review)}
              >
                <Feather name="message-square" size={13} color={Colors.accent} />
                <Text style={styles.replyBtnTxt}>Reply to {review.authorName}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ))}
      </ScrollView>

      {/* Reply Modal */}
      <Modal
        visible={!!replyingTo}
        animationType="slide"
        transparent
        onRequestClose={() => setReplyingTo(null)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View entering={FadeInUp} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reply to Review</Text>
                <Text style={styles.modalSub}>Replying to {replyingTo?.authorName}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.quoteBox}>
              <Text style={styles.quoteText}>&quot;{replyingTo?.text}&quot;</Text>
            </View>

            <Text style={styles.inputLabel}>YOUR RESPONSE</Text>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder={`Thank you for visiting ${appName}! We look forward to seeing you again 🍏`}
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
              style={styles.textInput}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitReply.isPending && { opacity: 0.6 }]}
              onPress={() => submitReply.mutate({ reviewId: replyingTo.authorName, replyText })}
              disabled={submitReply.isPending}
            >
              {submitReply.isPending
                ? <ActivityIndicator color={Colors.background} />
                : <Text style={styles.submitTxt}>Post Reply</Text>}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingTxt: { ...Typography.bodySmall, color: Colors.textSecondary },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  headerTitle: { ...Typography.subheading, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  headerRight: { width: 36 },

  scroll: { flex: 1, paddingHorizontal: Spacing.lg },

  // Rating Hero
  ratingHero:   { backgroundColor: Colors.surface, borderRadius: Radius.xxl, padding: Spacing.xl, marginVertical: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.sm },
  gCircle:      { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  ratingNum:    { fontSize: 52, fontWeight: '800', color: Colors.accent, lineHeight: 60 },
  ratingCount:  { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.xs },
  mapsBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, backgroundColor: Colors.accentDim, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accent + '40' },
  mapsBtnTxt:   { ...Typography.caption, color: Colors.accent, fontWeight: '700' },

  // Review Card
  reviewCard:   { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.accent + '40' },
  avatarText:   { ...Typography.subheading, color: Colors.accent, fontSize: 16 },
  authorName:   { ...Typography.subheading, color: Colors.textPrimary, fontSize: 14 },
  timeAgo:      { ...Typography.caption, color: Colors.textTertiary },
  reviewText:   { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },

  // Reply
  replyBox:     { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.accent },
  replyLabel:   { ...Typography.caption, color: Colors.accent, fontWeight: '700', marginBottom: 4 },
  replyContent: { ...Typography.bodySmall, color: Colors.textPrimary },
  replyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyBtnTxt:  { ...Typography.caption, color: Colors.accent, fontWeight: '700' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xl, paddingBottom: 40, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.lg },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle:    { ...Typography.heading, color: Colors.textPrimary },
  modalSub:      { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  closeBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  quoteBox:      { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  quoteText:     { ...Typography.bodySmall, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  inputLabel:    { ...Typography.caption, color: Colors.textTertiary },
  textInput:     { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg, padding: Spacing.lg, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.surfaceBorder, minHeight: 100, textAlignVertical: 'top', ...Typography.body },
  submitBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.full, padding: Spacing.lg, alignItems: 'center', ...Shadows.green },
  submitTxt:     { ...Typography.subheading, color: Colors.background, fontWeight: '700' },
});
