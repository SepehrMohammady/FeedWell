import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * CustomAlert - A themed alert dialog that replaces native Alert.alert
 * 
 * Usage:
 *   <CustomAlert
 *     visible={showAlert}
 *     title="Title"
 *     message="Message text"
 *     icon="bookmark"
 *     buttons={[
 *       { text: 'Cancel', style: 'cancel', onPress: () => {} },
 *       { text: 'OK', onPress: () => {} },
 *       { text: 'Delete', style: 'destructive', onPress: () => {} },
 *     ]}
 *     onDismiss={() => setShowAlert(false)}
 *   />
 */
export default function CustomAlert({ visible, title, message, icon, buttons = [], onDismiss }) {
  const { theme } = useTheme();

  const handleButtonPress = (button) => {
    button.onPress?.();
    onDismiss?.();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      width: '100%',
      maxWidth: 340,
      overflow: 'hidden',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    header: {
      paddingTop: 24,
      paddingHorizontal: 24,
      paddingBottom: icon ? 12 : 0,
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: (theme.colors.primary || '#007AFF') + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    messageContainer: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 20,
    },
    message: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    buttonsContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
    },
    buttonDefault: {
      backgroundColor: theme.colors.primary || '#007AFF',
    },
    buttonCancel: {
      backgroundColor: theme.colors.border || '#E0E0E0',
    },
    buttonDestructive: {
      backgroundColor: (theme.colors.error || '#FF3B30') + '15',
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    buttonTextDefault: {
      color: '#fff',
    },
    buttonTextCancel: {
      color: theme.colors.textSecondary,
    },
    buttonTextDestructive: {
      color: theme.colors.error || '#FF3B30',
    },
  });

  // Sort buttons: destructive first, then default actions, cancel last
  const sortedButtons = [...buttons].sort((a, b) => {
    const order = { destructive: 0, default: 1, cancel: 2 };
    const aOrder = order[a.style] ?? 1;
    const bOrder = order[b.style] ?? 1;
    return aOrder - bOrder;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.header}>
                {icon && (
                  <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={24} color={theme.colors.primary} />
                  </View>
                )}
                <Text style={styles.title}>{title}</Text>
              </View>
              {message ? (
                <View style={styles.messageContainer}>
                  <Text style={styles.message}>{message}</Text>
                </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.buttonsContainer}>
                {sortedButtons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        isCancel
                          ? styles.buttonCancel
                          : isDestructive
                          ? styles.buttonDestructive
                          : styles.buttonDefault,
                      ]}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel
                            ? styles.buttonTextCancel
                            : isDestructive
                            ? styles.buttonTextDestructive
                            : styles.buttonTextDefault,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
