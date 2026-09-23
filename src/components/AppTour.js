import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTour } from '../context/TourContext';
import { TOUR_STEPS } from '../config/tourSteps';

const HOLE_PADDING = 6;
const NAV_SETTLE_MS = 420;      // let a screen transition finish before measuring
const MEASURE_RETRY_MS = 120;
const MEASURE_ATTEMPTS = 12;    // ~1.5 s, then fall back to a centred card
const DIM = 'rgba(0, 0, 0, 0.72)';

function targetRouteName(nav) {
  if (!nav) return null;
  return nav[1]?.screen || nav[0];
}

// Guided tour overlay: dims the app, rings the control a step is about and
// explains it in a card. Rendered above the navigator (see App.js).
export default function AppTour({ navigationRef }) {
  const tour = useTour();
  const { theme } = useTheme();
  const { t, isRTL, formatNumber } = useTranslation();
  const { reduceMotion } = useAppSettings();
  const insets = useSafeAreaInsets();
  const { width: W, height: windowH } = useWindowDimensions();
  // Measured height of the overlay itself: on some Android versions the window
  // height excludes system bars, and targets are measured against the root view.
  const [overlayH, setOverlayH] = useState(null);
  const H = overlayH || windowH;

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [ready, setReady] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const startTabRef = useRef(null);
  const visitedAddFeedRef = useRef(false);

  const active = !!tour?.active;
  const runId = tour?.runId;
  const step = TOUR_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === TOUR_STEPS.length - 1;

  // A new run starts at step one and remembers the tab to return to.
  useEffect(() => {
    if (!active) return;
    setIndex(0);
    visitedAddFeedRef.current = false;
    try {
      const state = navigationRef.isReady() ? navigationRef.getRootState() : null;
      startTabRef.current = state ? state.routes[state.index]?.name || null : null;
    } catch (e) {
      startTabRef.current = null;
    }
  }, [active, runId, navigationRef]);

  // Per step: go to its screen, then find the target on screen.
  useEffect(() => {
    if (!active || !step) return undefined;
    let cancelled = false;
    let timer = null;
    let attempts = 0;
    let previous = null;

    setReady(false);
    setRect(null);
    fade.setValue(0);

    let navigated = false;
    if (step.nav && navigationRef.isReady()) {
      // On first launch the navigator may not have been ready when the tour
      // started, so remember the starting tab just before the first move.
      if (!startTabRef.current) {
        try {
          const state = navigationRef.getRootState();
          startTabRef.current = state?.routes?.[state.index]?.name || null;
        } catch (e) { /* ignore */ }
      }
      const destination = targetRouteName(step.nav);
      const current = navigationRef.getCurrentRoute()?.name;
      if (current !== destination) {
        try {
          navigationRef.navigate(...step.nav);
          navigated = true;
          if (destination === 'AddFeed') visitedAddFeedRef.current = true;
        } catch (e) { /* stay put; the card still explains the step */ }
      }
    }

    const settle = (r) => {
      if (cancelled) return;
      setRect(r);
      setReady(true);
    };

    // A target that isn't registered at all (e.g. a button the current filter
    // hides) won't appear, so give up on it three times as fast.
    const retryOrGiveUp = (registered = true) => {
      attempts += registered ? 1 : 3;
      if (attempts >= MEASURE_ATTEMPTS) settle(null);
      else timer = setTimeout(measure, MEASURE_RETRY_MS);
    };

    function measure() {
      if (cancelled) return;
      const node = tour.getTarget(step.target);
      if (!node || typeof node.measureInWindow !== 'function') {
        retryOrGiveUp(false);
        return;
      }
      node.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        const onScreen = w > 0 && h > 0 && y >= 0 && y + h <= H && x > -2 && x + w <= W + 2;
        if (!onScreen) {
          previous = null;
          retryOrGiveUp();
          return;
        }
        // Two matching readings in a row: the screen has stopped moving.
        if (previous && Math.abs(previous.x - x) < 1 && Math.abs(previous.y - y) < 1
          && Math.abs(previous.w - w) < 1 && Math.abs(previous.h - h) < 1) {
          settle({ x, y, w, h });
        } else {
          previous = { x, y, w, h };
          timer = setTimeout(measure, MEASURE_RETRY_MS);
        }
      });
    }

    if (step.target) {
      timer = setTimeout(measure, navigated ? NAV_SETTLE_MS : 40);
    } else {
      timer = setTimeout(() => settle(null), navigated ? NAV_SETTLE_MS : 0);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, runId, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    Animated.timing(fade, {
      toValue: 1,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [ready, fade, reduceMotion]);

  const finish = useCallback(() => {
    const startTab = startTabRef.current;
    const leftAddFeedOpen = visitedAddFeedRef.current;
    tour.endTour();
    if (!navigationRef.isReady()) return;
    try {
      // Don't leave the Add Feed screen the tour opened sitting in the Feeds tab.
      if (leftAddFeedOpen && navigationRef.getCurrentRoute()?.name === 'AddFeed') {
        navigationRef.navigate('Feeds', { screen: 'FeedList' });
      }
      if (startTab) navigationRef.navigate(startTab);
    } catch (e) { /* ignore */ }
  }, [tour, navigationRef]);

  const goNext = useCallback(() => {
    if (isLast) finish();
    else setIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  }, [isLast, finish]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Android back steps backwards through the tour, and leaves it from step one.
  useEffect(() => {
    if (!active) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFirst) finish();
      else goBack();
      return true;
    });
    return () => sub.remove();
  }, [active, isFirst, finish, goBack]);

  if (!active || !step) return null;

  const cardWidth = Math.min(W - 32, 440);
  const cardLeft = (W - cardWidth) / 2;

  let hole = null;
  let cardPlacement = null;
  if (ready && rect) {
    const top = Math.max(0, rect.y - HOLE_PADDING);
    const left = Math.max(0, rect.x - HOLE_PADDING);
    const bottom = Math.min(H, rect.y + rect.h + HOLE_PADDING);
    const right = Math.min(W, rect.x + rect.w + HOLE_PADDING);
    hole = { top, left, width: right - left, height: bottom - top, bottom, right };
    const targetInTopHalf = rect.y + rect.h / 2 < H / 2;
    cardPlacement = targetInTopHalf
      ? { top: Math.max(bottom + 14, insets.top + 8) }
      : { bottom: Math.max(H - top + 14, insets.bottom + 8) };
  }

  const align = isRTL ? 'right' : 'left';
  const row = isRTL ? 'row-reverse' : 'row';

  const card = (
    <Animated.View
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: fade,
        },
        cardPlacement ? { position: 'absolute', left: cardLeft, ...cardPlacement } : null,
      ]}
    >
      <View style={[styles.cardHeader, { flexDirection: row }]}>
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.primary + '22' }]}>
          <Ionicons name={step.icon} size={20} color={theme.colors.primary} />
        </View>
        <Text
          style={[styles.title, { color: theme.colors.text, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }]}
          numberOfLines={2}
        >
          {t(step.titleKey)}
        </Text>
        <Text style={[styles.counter, { color: theme.colors.textSecondary }]}>
          {t('tour.stepCount', { current: formatNumber(index + 1), total: formatNumber(TOUR_STEPS.length) })}
        </Text>
      </View>

      <Text style={[styles.body, { color: theme.colors.textSecondary, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {t(step.bodyKey)}
      </Text>

      <View style={[styles.footer, { flexDirection: row }]}>
        {!isLast && (
          <TouchableOpacity onPress={finish} style={styles.textButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.textButtonLabel, { color: theme.colors.textSecondary }]}>{t('tour.skip')}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.spacer} />
        {!isFirst && (
          <TouchableOpacity onPress={goBack} style={styles.textButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.textButtonLabel, { color: theme.colors.primary }]}>{t('tour.back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={goNext} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.primaryButtonLabel}>{isLast ? t('common.done') : t('tour.next')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setOverlayH(e.nativeEvent.layout.height)}
    >
      {/* Swallows every touch so the app can't be used underneath the tour. */}
      <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} />

      {hole ? (
        <>
          <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.top }]} />
          <View pointerEvents="none" style={[styles.dim, { top: hole.bottom, left: 0, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[styles.dim, { top: hole.top, left: 0, width: hole.left, height: hole.height }]} />
          <View pointerEvents="none" style={[styles.dim, { top: hole.top, left: hole.right, right: 0, height: hole.height }]} />
          <View
            pointerEvents="none"
            style={[styles.ring, {
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              borderColor: theme.colors.primary,
            }]}
          />
        </>
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
      )}

      {ready && (cardPlacement ? card : (
        <View style={styles.centerWrap} pointerEvents="box-none">{card}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    backgroundColor: DIM,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 12,
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  counter: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  spacer: {
    flex: 1,
  },
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
