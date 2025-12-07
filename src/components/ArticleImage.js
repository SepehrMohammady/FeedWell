import React, { useState } from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ArticleImage({ uri, style, resizeMode = 'cover', showPlaceholder = true }) {
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  if (!uri || loadError) {
    if (!showPlaceholder) return null;
    
    // Use FeedWell logo as default image - use inverted logo for dark mode
    const placeholderBg = theme.dark ? '#3A3A3C' : theme.colors.border;
    
    return (
      <View style={[styles.placeholder, style, { backgroundColor: placeholderBg }]}>
        <Image
          source={theme.dark ? require('../../assets/logo-invert.png') : require('../../assets/logo.png')}
          style={styles.defaultLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
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
