import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { FONT, RADIUS } from '../theme/type';
import { buildColors } from '../theme/palette';

const SHOW_MS = 4500;

/**
 * A short note at the bottom of a list about what a swipe just did, with Undo
 * when it can be undone. `toast` is { id, message, onUndo? }: a new id shows a
 * new note. It goes by itself after a few seconds (onHide), or with Undo.
 */
export default function UndoToast({ toast, onHide }) {
  const { theme, paletteIndex, accentIndex } = useTheme();
  const { t, isRTL } = useTranslation();
  const styles = useStyles(isRTL);
  // The bar takes the other mode's colors, so Undo is in that mode's main ink
  const undoColor = buildColors(!theme.colors.isDark, paletteIndex, accentIndex, false).mainInk;
  const opacity = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!toast) return undefined;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHideRef.current?.(toast.id));
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast?.id]);

  if (!toast) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="box-none">
      <View style={styles.body}>
        <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        {toast.onUndo && (
          <TouchableOpacity
            onPress={() => {
              toast.onUndo();
              onHideRef.current?.(toast.id);
            }}
            style={styles.undo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.undoLabel, { color: undoColor }]}>{t('common.undo')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// A dark bar in light mode and a light one in dark mode, as a snackbar is
const useStyles = makeStyles(({ colors: c }, isRTL) => ({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'center',
  },
  body: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    maxWidth: 520,
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.tile,
    backgroundColor: c.text,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  message: {
    flex: 1,
    fontFamily: FONT.medium,
    fontSize: 14,
    color: c.surface,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  undo: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  undoLabel: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
  },
}));
