import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { FONT } from '../theme/type';

// How far a row must go, as a share of its width (at most MAX_REACH), before
// letting go does the action; a fast flick does it from MIN_FLICK on
const REACH = 0.33;
const MAX_REACH = 150;
const MIN_FLICK = 48;
const FLICK_SPEED = 1100;

const springBack = (value, done) =>
  Animated.spring(value, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start(done);

/**
 * What an action looks like under the row: its words, icon and colors. Read
 * and Save say what they will do to this article (read or unread, save or
 * unsave).
 */
function useActionLook(action, { isRead, isSaved }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  switch (action) {
    case 'read':
      return isRead
        ? { label: t('feedList.markUnreadLabel'), icon: 'mail-unread-outline', tint: c.mainTint, ink: c.mainInk, fill: c.primary, onFill: c.onPrimary }
        : { label: t('feedList.markReadLabel'), icon: 'mail-open-outline', tint: c.mainTint, ink: c.mainInk, fill: c.primary, onFill: c.onPrimary };
    case 'save':
      return isSaved
        ? { label: t('saveButton.unsave'), icon: 'bookmark', tint: c.accentTint, ink: c.accentInk, fill: c.accentFill, onFill: c.onAccentFill }
        : { label: t('common.save'), icon: 'bookmark-outline', tint: c.accentTint, ink: c.accentInk, fill: c.accentFill, onFill: c.onAccentFill };
    case 'share':
      return { label: t('articleActions.share'), icon: 'share-outline', tint: c.mainTint, ink: c.mainInk, fill: c.primary, onFill: c.onPrimary };
    case 'remove':
      return { label: t('common.remove'), icon: 'trash-outline', tint: c.errorTint, ink: c.error, fill: c.error, onFill: c.onError };
    default:
      return null;
  }
}

/**
 * An article row that swipes, as Outlook's mail does. Swiping right does
 * `rightAction` and swiping left `leftAction` (config/swipeActions): the row
 * follows the finger, the action shows underneath in its tint, and once the
 * row is far enough to do it, in its full color. Letting go there does it;
 * letting go early puts the row back. Remove slides the row away first.
 * Vertical drags stay with the list, so scrolling is never caught.
 */
export default function SwipeRow({ children, rightAction = 'none', leftAction = 'none', enabled = true, isRead, isSaved, onAction, rowColor, style }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const width = useRef(0);
  const armedRef = useRef(false);
  const [side, setSide] = useState(null); // 'right' or 'left': which way the row is going
  const [armed, setArmed] = useState(false);
  const rightOn = enabled && rightAction !== 'none';
  const leftOn = enabled && leftAction !== 'none';
  const { isRTL } = useTranslation();
  const rightLook = useActionLook(rightAction, { isRead, isSaved });
  const leftLook = useActionLook(leftAction, { isRead, isSaved });

  // Kept in refs, so the gesture made once still sees the current props
  const latest = useRef({});
  latest.current = { rightOn, leftOn, rightAction, leftAction, onAction };

  const reach = () => Math.min(MAX_REACH, Math.max(72, width.current * REACH));

  const reset = () => {
    armedRef.current = false;
    setArmed(false);
    setSide(null);
  };

  const gesture = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .enabled(rightOn || leftOn)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const { rightOn: r, leftOn: l } = latest.current;
      let dx = e.translationX;
      if ((dx > 0 && !r) || (dx < 0 && !l)) dx = 0;
      translateX.setValue(dx);
      const nextSide = dx > 0 ? 'right' : dx < 0 ? 'left' : null;
      setSide((prev) => (prev === nextSide ? prev : nextSide));
      const isArmed = Math.abs(dx) >= reach();
      if (isArmed !== armedRef.current) {
        armedRef.current = isArmed;
        setArmed(isArmed);
      }
    })
    .onEnd((e) => {
      const { rightOn: r, leftOn: l, rightAction: ra, leftAction: la, onAction: act } = latest.current;
      const dx = e.translationX;
      const allowed = (dx > 0 && r) || (dx < 0 && l);
      const flick = Math.abs(dx) >= MIN_FLICK && Math.abs(e.velocityX) >= FLICK_SPEED && Math.sign(e.velocityX) === Math.sign(dx);
      const action = dx > 0 ? ra : la;
      if (allowed && (armedRef.current || flick)) {
        if (action === 'remove') {
          // Off it goes, then the list lets it go
          Animated.timing(translateX, {
            toValue: Math.sign(dx) * (width.current || 400),
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            act?.(action);
            translateX.setValue(0);
            reset();
          });
          return;
        }
        act?.(action);
      }
      springBack(translateX, reset);
    })
    .onFinalize((e, success) => {
      if (!success) springBack(translateX, reset);
    }), [translateX, rightOn, leftOn]);

  const look = side === 'right' ? rightLook : side === 'left' ? leftLook : null;

  return (
    <View
      style={[styles.clip, style]}
      onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}
    >
      {look && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.under,
            { backgroundColor: armed ? look.fill : look.tint },
            // Icon first in reading order, so on its right in RTL. The sides
            // stay physical: row-reverse turns flex-start into the right edge.
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: (side === 'right') !== isRTL ? 'flex-start' : 'flex-end',
            },
          ]}
        >
          <Ionicons name={look.icon} size={22} color={armed ? look.onFill : look.ink} />
          <Text style={[styles.label, { color: armed ? look.onFill : look.ink }]} numberOfLines={1}>
            {look.label}
          </Text>
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <Animated.View style={{ backgroundColor: rowColor, transform: [{ translateX }] }}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  // A swipe right shows its action at the left edge, a swipe left at the right
  under: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: FONT.semiBold,
    fontSize: 13.5,
  },
});
