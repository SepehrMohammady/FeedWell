import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ReadingPositionIndicator({ onPress, onClear, isActive = false, style }) {
  const { theme } = useTheme();

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
          color="#fff" 
        />
      </TouchableOpacity>
      <View style={styles.line} />
    </View>
  );
}
