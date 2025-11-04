import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ReadingPositionIndicator({ onPress, onClear, isActive = false, style }) {
  const { theme } = useTheme();

  // Determine icon color based on background:
  // When active: accent color background, when inactive: textSecondary background
  // In dark mode: textSecondary is light (#EBEBF5), accent might be bright, so use dark icon
  // In light mode: textSecondary is dark (#666), so use light icon
  const iconColor = isActive 
    ? (theme.dark ? '#fff' : '#000')  // Active state: opposite of theme
    : (theme.dark ? '#000' : '#fff'); // Inactive state: textSecondary is light in dark mode

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginVertical: 2,
      paddingVertical: 4,
      ...style,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: isActive ? theme.colors.accent : theme.colors.border,
    },
    bullet: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: isActive ? theme.colors.accent : theme.colors.textSecondary,
      marginHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <TouchableOpacity 
        style={styles.bullet}
        onPress={isActive ? onClear : onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons 
          name="bookmark" 
          size={12} 
          color={iconColor} 
        />
      </TouchableOpacity>
      <View style={styles.line} />
    </View>
  );
}
