/**
 * TableBook — Green Apple Restaurant Design System
 * Premium green-on-dark theme: inspired by fresh produce & modern hospitality.
 */

import { StyleSheet } from 'react-native';

export const Colors = {
  // ── Base ────────────────────────────────────
  background:      '#090B10',   // deep dark background
  surface:         '#121620',   // elevated dark surface
  surfaceElevated: '#1a202c',   // elevated card
  surfaceBorder:   '#1F2433',   // subtle border

  // ── Primary Accent — Neon Blue ───────────
  accent:       '#00F0FF',      // vibrant neon blue
  accentDark:   '#00B3CC',      // deep neon blue
  accentLight:  '#80F8FF',      // bright highlight
  accentDim:    'rgba(0,240,255,0.12)',

  // ── Secondary Accent — Neon Purple ─────────────────
  lime:         '#7000FF',
  limeDim:      'rgba(112,0,255,0.12)',

  // ── Text ────────────────────────────────────
  textPrimary:   '#FFFFFF',
  textSecondary: '#8A94A6',
  textTertiary:  '#5C677D',
  textInverse:   '#090B10',

  // ── Semantic Status — Tables ────────────────
  available:    '#00FF66',
  availableDim: 'rgba(0,255,102,0.15)',
  occupied:     '#FF3366',
  occupiedDim:  'rgba(255,51,102,0.15)',
  reserved:     '#FFB800',
  reservedDim:  'rgba(255,184,0,0.15)',
  cleaning:     '#7000FF',
  cleaningDim:  'rgba(112,0,255,0.15)',
  blocked:      '#374151',
  blockedDim:   'rgba(55,65,81,0.15)',

  // ── Semantic Status — Bookings ──────────────
  pending:      '#00F0FF',
  pendingDim:   'rgba(0,240,255,0.15)',
  confirmed:    '#00FF66',
  confirmedDim: 'rgba(0,255,102,0.15)',
  checkedIn:    '#00CC52',
  checkedInDim: 'rgba(0,204,82,0.15)',
  completed:    '#8A94A6',
  completedDim: 'rgba(138,148,166,0.15)',
  cancelled:    '#4b5563',
  cancelledDim: 'rgba(75,85,99,0.15)',
  noShow:       '#FF3366',
  noShowDim:    'rgba(255,51,102,0.15)',

  // ── Delivery Status ─────────────────────────
  deliveryPending:    '#FFB800',
  deliveryPreparing:  '#00F0FF',
  deliveryDispatched: '#7000FF',
  deliveryDelivered:  '#00FF66',

  // ── Communication ───────────────────────────
  whatsapp:    '#00FF66',
  whatsappDim: 'rgba(0,255,102,0.15)',
  phone:       '#00F0FF',
  phoneDim:    'rgba(0,240,255,0.15)',
  sms:         '#FFB800',
  smsDim:      'rgba(255,184,0,0.15)',

  // ── AI ─────────────────────────────────────
  ai:              '#00F0FF',
  aiGradientStart: '#7000FF',
  aiGradientEnd:   '#00F0FF',
  aiDim:           'rgba(0,240,255,0.15)',
  aiGlass:         'rgba(112,0,255,0.25)',

  // ── Utility ─────────────────────────────────
  error:       '#FF3366',
  success:     '#00FF66',
  warning:     '#FFB800',
  info:        '#00F0FF',
  overlay:     'rgba(9,11,16,0.8)',
  transparent: 'transparent',
  surfaceGlass: 'rgba(18, 22, 32, 0.65)',
  surfaceElevatedGlass: 'rgba(26, 32, 44, 0.75)',
  accentPurple: '#7000FF',
};

export const TableStatusColors: Record<string, { bg: string; dim: string; label: string }> = {
  available: { bg: Colors.available, dim: Colors.availableDim, label: 'Available' },
  occupied:  { bg: Colors.occupied,  dim: Colors.occupiedDim,  label: 'Occupied'  },
  reserved:  { bg: Colors.reserved,  dim: Colors.reservedDim,  label: 'Reserved'  },
  cleaning:  { bg: Colors.cleaning,  dim: Colors.cleaningDim,  label: 'Cleaning'  },
  blocked:   { bg: Colors.blocked,   dim: Colors.blockedDim,   label: 'Blocked'   },
};

export const BookingStatusColors: Record<string, { bg: string; dim: string; label: string }> = {
  pending:    { bg: Colors.pending,    dim: Colors.pendingDim,    label: 'Pending'    },
  confirmed:  { bg: Colors.confirmed,  dim: Colors.confirmedDim,  label: 'Confirmed'  },
  checked_in: { bg: Colors.checkedIn,  dim: Colors.checkedInDim,  label: 'Checked In' },
  completed:  { bg: Colors.completed,  dim: Colors.completedDim,  label: 'Completed'  },
  cancelled:  { bg: Colors.cancelled,  dim: Colors.cancelledDim,  label: 'Cancelled'  },
  no_show:    { bg: Colors.noShow,     dim: Colors.noShowDim,     label: 'No Show'    },
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 18, xl: 24, xxl: 32, full: 9999,
};

export const Typography = {
  displayLarge:  { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  displayMedium: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading:       { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  subheading:    { fontSize: 17, fontWeight: '600' as const },
  body:          { fontSize: 15, fontWeight: '400' as const },
  bodySmall:     { fontSize: 13, fontWeight: '400' as const },
  caption:       { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8 },
  mono:          { fontSize: 13, fontFamily: 'monospace' as const },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  accent: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  neon: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  premium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  green: {
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const appStyles = StyleSheet.create({
  commBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 6,
  },
  commBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
