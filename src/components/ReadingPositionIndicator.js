import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ReadingPositionIndicator({ onPress, onClear, style }) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.accent + '20',
      borderColor: theme.colors.accent,
      borderWidth: 2,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginVertical: 4,
      ...style,
    },
    icon: {
      marginRight: 8,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      padding: 4,
    },
  });

  return (
    <View style={styles.container}>
      <Ionicons 
        name="bookmark" 
        size={20} 
        color={theme.colors.accent} 
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Reading Position</Text>
        <Text style={styles.subtitle}>Tap to continue reading from here</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color={theme.colors.accent} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons 
            name="close" 
            size={16} 
            color={theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
