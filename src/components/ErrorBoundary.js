import React from 'react';
import { Appearance, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tStatic, RTL_LANGUAGES } from '../i18n';
import { getLastLanguage } from '../context/LanguageContext';
import { getLastThemeColors } from '../context/ThemeContext';
import { APP_VERSION } from '../config/version';
import { buildColors, DEFAULT_MAIN_COLOR } from '../theme/palette';
import { FONT, TYPE, RADIUS } from '../theme/type';

// The crash screen. It sits outside the providers (around the whole app, and
// around the reader), so it reads the language and the colors last in use from
// the modules that keep them, and shows the version, so a screenshot of it says
// which build failed.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const language = getLastLanguage();
      const t = (key, vars) => tStatic(key, language, vars);
      const writingDirection = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
      // The app's colors if it got as far as drawing them; otherwise the
      // default pair in the phone's mode
      const colors = getLastThemeColors() || buildColors(Appearance.getColorScheme() === 'dark', DEFAULT_MAIN_COLOR, null, false);
      const styles = stylesFor(colors);
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.title, { writingDirection }]}>{t('crash.title')}</Text>
          <Text style={[styles.message, { writingDirection }]}>{t('crash.message')}</Text>
          {__DEV__ && (
            <Text style={styles.errorDetails}>
              {this.state.error?.message}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
          {/* The version in Latin digits, as people quote it in reports */}
          <Text style={styles.version}>{tStatic('whatsNew.version', 'en', { version: APP_VERSION.version })}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Neutral text and icon and a primary button (Calm Surfaces 3), one set per colors object
const cache = new WeakMap();
const stylesFor = (c) => {
  let styles = cache.get(c);
  if (!styles) {
    styles = StyleSheet.create({
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: c.background,
      },
      title: {
        fontFamily: FONT.bold,
        fontSize: 24,
        letterSpacing: -0.3,
        color: c.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
      },
      message: {
        ...TYPE.body,
        fontSize: 16,
        color: c.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
      },
      errorDetails: {
        fontSize: 12,
        color: c.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'monospace',
      },
      retryButton: {
        backgroundColor: c.primary,
        paddingHorizontal: 24,
        minHeight: 46,
        justifyContent: 'center',
        borderRadius: RADIUS.round,
      },
      retryButtonText: {
        ...TYPE.button,
        fontSize: 15,
        color: c.onPrimary,
      },
      version: {
        ...TYPE.secondary,
        color: c.textSecondary,
        marginTop: 24,
      },
    });
    cache.set(c, styles);
  }
  return styles;
};
