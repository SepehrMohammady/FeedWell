import React from 'react';
import { Appearance, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildColors, DEFAULT_MAIN_COLOR } from '../theme/palette';
import { FONT, TYPE, RADIUS } from '../theme/type';

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
      // This screen can stand outside the theme, so it takes the default colors
      // in the app's mode (App sets the mode with Appearance.setColorScheme).
      const styles = stylesFor(Appearance.getColorScheme() === 'dark');
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={64} color={styles.icon.color} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Please try again.
          </Text>
          {__DEV__ && (
            <Text style={styles.errorDetails}>
              {this.state.error?.message}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Neutral text and icon, and a primary button (Calm Surfaces 3), one set per mode
const cache = {};
const stylesFor = (isDark) => {
  const key = isDark ? 'dark' : 'light';
  if (!cache[key]) {
    const c = buildColors(isDark, DEFAULT_MAIN_COLOR, null, false);
    cache[key] = StyleSheet.create({
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: c.background,
      },
      icon: {
        color: c.textSecondary,
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
    });
  }
  return cache[key];
};
