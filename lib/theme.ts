/**
 * TableBook — Green Apple Restaurant Design System
 * Premium green-on-dark theme: inspired by fresh produce & modern hospitality.
 */

import { StyleSheet } from 'react-native';

export const Colors = {
  // ── Base ────────────────────────────────────
  background:      '#0b0f0b',   // near-black with green tint
  surface:         '#121a12',   // dark green surface
  surfaceElevated: '#1a251a',   // elevated card
  surfaceBorder:   '#243024',   // subtle green border

  // ── Primary Accent — Apple Green ───────────
  accent:       '#4ade80',      // vibrant leaf green
  accentDark:   '#16a34a',      // deep forest green
  accentLight:  '#86efac',      // mint highlight
  accentDim:    'rgba(74,222,128,0.12)',

  // ── Secondary Accent — Lime ─────────────────
  lime:         '#a3e635',
  limeDim:      'rgba(163,230,53,0.12)',

  // ── Text ────────────────────────────────────
  textPrimary:   '#f0fdf4',     // near-white with green tint
  textSecondary: '#86efac',     // soft green
  textTertiary:  '#4b7a5a',     // muted green
  textInverse:   '#0b120b',

  // ── Semantic Status — Tables ────────────────
  available:    '#4ade80',
  availableDim: 'rgba(74,222,128,0.15)',
  occupied:     '#f87171',
  occupiedDim:  'rgba(248,113,113,0.15)',
  reserved:     '#facc15',
  reservedDim:  'rgba(250,204,21,0.15)',
  cleaning:     '#a78bfa',
  cleaningDim:  'rgba(167,139,250,0.15)',
  blocked:      '#374151',
  blockedDim:   'rgba(55,65,81,0.15)',

  // ── Semantic Status — Bookings ──────────────
  pending:      '#60a5fa',
  pendingDim:   'rgba(96,165,250,0.15)',
  confirmed:    '#4ade80',
  confirmedDim: 'rgba(74,222,128,0.15)',
  checkedIn:    '#34d399',
  checkedInDim: 'rgba(52,211,153,0.15)',
  completed:    '#6b7280',
  completedDim: 'rgba(107,114,128,0.15)',
  cancelled:    '#4b5563',
  cancelledDim: 'rgba(75,85,99,0.15)',
  noShow:       '#f87171',
  noShowDim:    'rgba(248,113,113,0.15)',

  // ── Delivery Status ─────────────────────────
  deliveryPending:    '#facc15',
  deliveryPreparing:  '#60a5fa',
  deliveryDispatched: '#a78bfa',
  deliveryDelivered:  '#4ade80',

  // ── Communication ───────────────────────────
  whatsapp:    '#25d366',
  whatsappDim: 'rgba(37,211,102,0.15)',
  phone:       '#60a5fa',
  phoneDim:    'rgba(96,165,250,0.15)',
  sms:         '#facc15',
  smsDim:      'rgba(250,204,21,0.15)',

  // ── AI ─────────────────────────────────────
  ai:              '#c084fc',
  aiGradientStart: '#7c3aed',
  aiGradientEnd:   '#4f46e5',
  aiDim:           'rgba(192,132,252,0.15)',

  // ── Utility ─────────────────────────────────
  error:       '#f87171',
  success:     '#4ade80',
  warning:     '#facc15',
  info:        '#60a5fa',
  overlay:     'rgba(0,0,0,0.7)',
  transparent: 'transparent',
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
  accent: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  green: {
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
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
