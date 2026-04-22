/**
 * TableBook — Premium Animation System
 * =====================================
 * Reusable animation hooks & utilities inspired by 2025 design trends:
 * - Staggered fade-in (cards, lists)
 * - Pulse glow (live status)
 * - Scale-on-press (micro-interaction)
 * - Shimmer (loading skeleton)
 * - Slide-up entrance
 */

import { useEffect, useRef, useCallback } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

// ── Staggered Fade In ────────────────────────────────────────────────────────
// Each item fades + slides up with a delay offset
export function useStaggeredFadeIn(count: number, delay = 80, duration = 400) {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  const slides = useRef(Array.from({ length: count }, () => new Animated.Value(20))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration,
          delay: i * delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slides[i], {
          toValue: 0,
          duration,
          delay: i * delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(0, animations).start();
  }, []);

  return { opacities: anims, translates: slides };
}

// ── Fade In on Mount ─────────────────────────────────────────────────────────
export function useFadeIn(duration = 500, delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, translateY };
}

// ── Pulse Glow (for live indicators) ─────────────────────────────────────────
export function usePulse(duration = 1800) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.5,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return { scale, opacity };
}

// ── Scale on Press (micro-interaction) ───────────────────────────────────────
export function useScalePress(toValue = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return { scale, onPressIn, onPressOut };
}

// ── Shimmer Loading Effect ───────────────────────────────────────────────────
export function useShimmer(duration = 1400) {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return translateX;
}

// ── Count-Up Number Animation ────────────────────────────────────────────────
export function useCountUp(target: number, duration = 800) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // must be false for non-transform/opacity
    }).start();
  }, [target]);

  return value;
}

// ── Slide Up from Bottom (for modals, sheets) ────────────────────────────────
export function useSlideUp(duration = 350) {
  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const slideIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const slideOut = useCallback(
    (cb?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 300,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(cb);
    },
    []
  );

  return { translateY, opacity, slideIn, slideOut };
}
