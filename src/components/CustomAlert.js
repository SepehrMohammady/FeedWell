import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useUi } from '../theme/ui';
import { TYPE } from '../theme/type';
import { useTranslation } from '../context/LanguageContext';

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
  const { isRTL } = useTranslation();
  const ui = useUi();
  const styles = useStyles(isRTL);

  const handleButtonPress = (button) => {
    button.onPress?.();
    onDismiss?.();
  };

  // Sort buttons: destructive first, then default actions, cancel last
  const sortedButtons = [...buttons].sort((a, b) => {
    const order = { destructive: 0, default: 1, cancel: 2 };
    const aOrder = order[a.style] ?? 1;
    const bOrder = order[b.style] ?? 1;
    return aOrder - bOrder;
  });

  // The icon sits in an accent circle, or a red one when the alert asks to
  // delete or remove something
  const isDestructiveAlert = buttons.some((button) => button.style === 'destructive');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[ui.dialog, styles.container]}>
              <View style={[styles.header, icon && styles.headerWithIcon]}>
                {icon && (
                  <View style={[styles.iconContainer, isDestructiveAlert && styles.iconContainerError]}>
                    <Ionicons name={icon} size={24} color={isDestructiveAlert ? theme.colors.error : theme.colors.accentInk} />
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
                {/* Fully round buttons: the main fill for the action, the main
                    tint for Cancel, red for what can't be undone */}
                {sortedButtons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        isCancel
                          ? ui.secondaryButton
                          : isDestructive
                          ? ui.dangerButton
                          : ui.primaryButton,
                        styles.button,
                      ]}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          isCancel
                            ? ui.secondaryLabel
                            : isDestructive
                            ? ui.dangerLabel
                            : ui.primaryLabel,
                          styles.buttonText,
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

// Built once per theme and direction (Calm Surfaces 3): a dialog of radius 20
// over a 40% scrim
const useStyles = makeStyles(({ colors: c }, isRTL) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    ...(c.hasShadows
      ? { elevation: 8, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12 }
      : c.amoled ? { borderWidth: 1, borderColor: c.cardBorder } : null),
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerWithIcon: {
    paddingBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.accentTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainerError: {
    backgroundColor: c.errorTint,
  },
  title: {
    ...TYPE.title,
    color: c.text,
    textAlign: 'center',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  messageContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  message: {
    ...TYPE.body,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  button: {
    minHeight: 46,
  },
  buttonText: {
    fontSize: 15,
  },
}));
