import React, { memo, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

// Each glow's center and radii as shares of the screen (Calm Surfaces 3 spec,
// section 4.1), x measured from the reading side: left, or right in
// right-to-left languages.
const GLOWS = [
  { key: 'main', x: 0, y: 0, rx: 0.612, ry: 0.36 },
  { key: 'accent', x: 1, y: 0.3, rx: 0.504, ry: 0.324 },
  { key: 'faint', x: 0.1, y: 1, rx: 0.612, ry: 0.36 },
];

// The whole screen, which the app draws over edge to edge; the window can
// leave the system bars out.
const useScreenSize = () => {
  const [size, setSize] = useState(() => Dimensions.get('screen'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ screen }) =>
      setSize((s) => (s.width === screen.width && s.height === screen.height ? s : screen))
    );
    return () => sub.remove();
  }, []);
  return size;
};

// The background wash: the page color with three soft round glows, the main
// color in the top corner on the reading side, the accent on the other side
// edge a third of the way down, and a faint main one at the bottom. One static
// layer behind the whole app, the status bar included; the pages are
// transparent over it (the article reader keeps a plain page). AMOLED black
// has none: the page stays pure black.
//
// Each glow is a view the size of its ellipse with a native radial gradient,
// never a full-screen layer, which would be repainted with every frame of a
// scroll. Rebuilt only when the colors, the direction or the screen's size
// change. FeedWell lays out right to left by hand (native RTL is off), so the
// glows mirror from the app's language rather than from `start`.
function ScreenWash() {
  const { theme } = useTheme();
  const { isRTL } = useTranslation();
  const { background, wash } = theme.colors;
  const { width, height } = useScreenSize();
  const glows = useMemo(
    () =>
      wash
        ? GLOWS.map((g) => {
            const color = wash[g.key];
            const fromReadingSide = (g.x - g.rx) * width;
            return {
              key: g.key,
              style: {
                position: 'absolute',
                left: isRTL ? width - fromReadingSide - 2 * g.rx * width : fromReadingSide,
                top: (g.y - g.ry) * height,
                width: 2 * g.rx * width,
                height: 2 * g.ry * height,
                // Full color at the center, fading in a straight line to the
                // same color at zero alpha at the ellipse's edge; plain
                // transparent would grey the edge. The web takes it as CSS.
                [Platform.OS === 'web' ? 'backgroundImage' : 'experimental_backgroundImage']:
                  `radial-gradient(50% 50% at 50% 50%, ${color} 0%, ${color}00 100%)`,
              },
            };
          })
        : [],
    [wash, width, height, isRTL]
  );

  return (
    <View pointerEvents="none" style={[styles.clip, { backgroundColor: background }]}>
      {glows.map((g) => (
        <View key={g.key} style={g.style} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});

export default memo(ScreenWash);
