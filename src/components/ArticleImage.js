import React, { useState } from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ArticleImage({ uri, style, resizeMode = 'cover', showPlaceholder = true }) {
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme, isDarkMode } = useTheme();

  // Upgrade http:// to https:// when possible (Android blocks cleartext by default)
  const safeUri = uri && uri.startsWith('http://') ? uri.replace('http://', 'https://') : uri;

  if (!safeUri || loadError) {
    if (!showPlaceholder) return null;
    
    // Use FeedWell logo as default image - use inverted logo for dark mode
    const placeholderBg = isDarkMode ? '#3A3A3C' : theme.colors.border;
    
    return (
      <View style={[styles.placeholder, style, { backgroundColor: placeholderBg }]}>
        <Image
          source={isDarkMode ? require('../../assets/logo-invert.png') : require('../../assets/logo.png')}
          style={styles.defaultLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: safeUri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        setLoadError(true);
        setLoading(false);
      }}
      onLoad={() => setLoading(false)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  defaultLogo: {
    width: '60%',
    height: '60%',
    opacity: 0.4,
  },
});
