/**
 * PrimaryButton — Green accent, filled button used for main CTAs.
 * Replaces ad-hoc Pressable + backgroundColor: Colors.accent patterns.
 */
import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing, Shadows } from '../lib/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: any;           // Ionicons name
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: object;
}

export function PrimaryButton({
  label, onPress, icon, loading = false, disabled = false, size = 'md', style,
}: PrimaryButtonProps) {
  const pad = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const fz  = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        { paddingVertical: pad },
        Shadows.accent,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={fz + 2} color="#fff" />}
          <Text style={[styles.label, { fontSize: fz }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent, borderRadius: Radius.md, gap: Spacing.sm,
  },
  label: { color: '#ffffff', fontWeight: '700', letterSpacing: 0.2 },
});
