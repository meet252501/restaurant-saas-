import React from 'react';
import { View, Text, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography, Shadows } from '../lib/theme';

interface CommunicationButtonsProps {
  guestName: string;
  guestPhone: string;
  bookingDate: string;
  bookingTime: string;
  tableNumber?: number;
  partySize?: number;
  restaurantName?: string;
}

export function CommunicationButtons({
  guestName,
  guestPhone,
  bookingDate,
  bookingTime,
  tableNumber,
  partySize,
  restaurantName = 'Our Restaurant',
}: CommunicationButtonsProps) {
  const confirmationMessage = buildConfirmationMessage({
    guestName,
    bookingDate,
    bookingTime,
    tableNumber,
    partySize,
    restaurantName,
  });

  const handleCall = async () => {
    const url = `tel:${guestPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot Call', `Your device cannot place calls to ${guestPhone}`);
    }
  };

  const handleSMS = async () => {
    // Universal SMS deep link (works on Android & iOS)
    const encoded = encodeURIComponent(confirmationMessage);
    const url = `sms:${guestPhone}${`?body=${encoded}`}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot SMS', 'Your device cannot open the SMS app.');
    }
  };

  const handleWhatsApp = async () => {
    const digits = guestPhone.replace(/\D/g, '');
    const encoded = encodeURIComponent(confirmationMessage);
    const url = `https://wa.me/${digits}?text=${encoded}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send messages.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Contact Guest</Text>

      {/* Message preview */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Confirmation Message Preview</Text>
        <Text style={styles.previewText}>{confirmationMessage}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.callBtn, pressed && styles.pressed]}
          onPress={handleCall}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.btnText}>Call</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, styles.smsBtn, pressed && styles.pressed]}
          onPress={handleSMS}
        >
          <Ionicons name="chatbubble" size={18} color="#fff" />
          <Text style={styles.btnText}>SMS</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, styles.waBtn, pressed && styles.pressed]}
          onPress={handleWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={styles.btnText}>WhatsApp</Text>
        </Pressable>
      </View>
    </View>
  );
}

function buildConfirmationMessage({
  guestName,
  bookingDate,
  bookingTime,
  tableNumber,
  partySize,
  restaurantName,
}: Omit<CommunicationButtonsProps, 'guestPhone'>) {
  const tableStr = tableNumber ? `Table ${tableNumber}` : 'your table';
  const partyStr = partySize ? `${partySize} guest${partySize > 1 ? 's' : ''}` : '';
  return (
    `Hello ${guestName}! 🍽️\n\n` +
    `Your reservation at *${restaurantName}* is confirmed:\n` +
    `📅 Date: ${bookingDate}\n` +
    `⏰ Time: ${bookingTime}\n` +
    (partyStr ? `👥 Party: ${partyStr}\n` : '') +
    (tableNumber ? `🪑 ${tableStr}\n` : '') +
    `\nPlease arrive on time. If you need to cancel or modify your booking, call us directly.\n\n` +
    `Looking forward to welcoming you! 😊`
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  preview: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.xs,
  },
  previewLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  pressed: { opacity: 0.8 },
  callBtn: { backgroundColor: Colors.phone },
  smsBtn: { backgroundColor: Colors.sms },
  waBtn: { backgroundColor: Colors.whatsapp },
  btnText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});
