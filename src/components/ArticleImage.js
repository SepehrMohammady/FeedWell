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
    
    return (
      <View style={[styles.placeholder, style, { backgroundColor: theme.colors.border }]}>
        <Ionicons 
          name="image-outline" 
          size={24} 
          color={theme.colors.textTertiary} 
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
});
