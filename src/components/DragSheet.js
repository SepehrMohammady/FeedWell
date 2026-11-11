import React, { createContext, useContext, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '../context/LanguageContext';

const DragContext = createContext(null);

// How far down a drag must go, or how fast, to close the sheet
const CLOSE_DISTANCE = 80;
const CLOSE_VELOCITY = 0.9;

const settle = (value) =>
  Animated.spring(value, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();

/**
 * A bottom sheet that closes the ways people expect: a tap on the dimmed page
 * above it, or a drag down on its top (the handle and the title row, which go
 * inside <SheetDragArea>). The sheet follows the finger and springs back when
 * let go early. It goes inside the overlay that holds it at the bottom of the
 * Modal, in place of the sheet's own View; the Modal still opens and closes it.
 */
export function DragSheet({ onClose, style, children }) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const responder = useMemo(() => PanResponder.create({
    // The sheet's top takes a touch that starts on it: otherwise a view
    // around the Modal does, and the drag never reaches the sheet. A touch on
    // its close button stays the button's until it moves down.
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > CLOSE_DISTANCE || (g.dy > 12 && g.vy > CLOSE_VELOCITY)) {
        onCloseRef.current?.();
      } else {
        settle(translateY);
      }
    },
    onPanResponderTerminate: () => settle(translateY),
  }), [translateY]);

  return (
    <>
      {/* The dimmed page above the sheet: a tap there closes it */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => onCloseRef.current?.()}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />
      <Animated.View style={[style, { transform: [{ translateY }] }]}>
        <DragContext.Provider value={responder.panHandlers}>
          {children}
        </DragContext.Provider>
      </Animated.View>
    </>
  );
}

/** The part of a sheet that drags it down: its handle and its title row */
export function SheetDragArea({ children, style }) {
  const handlers = useContext(DragContext);
  return (
    <View style={style} {...(handlers || {})}>
      {children}
    </View>
  );
}
