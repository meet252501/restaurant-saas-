/**
 * SecondaryButton — Outlined, neutral button for back/cancel/secondary actions.
 */
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '../lib/theme';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: any;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: object;
  danger?: boolean;    // red tint for destructive actions
}

export function SecondaryButton({
  label, onPress, icon, disabled = false, size = 'md', style, danger = false,
}: SecondaryButtonProps) {
  const pad = size === 'sm' ? 9 : size === 'lg' ? 16 : 12;
  const fz  = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;
  const color = danger ? Colors.error : Colors.textSecondary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        { paddingVertical: pad, borderColor: danger ? Colors.error + '60' : Colors.surfaceBorder },
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon && <Ionicons name={icon} size={fz + 2} color={color} />}
      <Text style={[styles.label, { fontSize: fz, color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  label: { fontWeight: '600', letterSpacing: 0.1 },
});
