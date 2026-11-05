import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { useUi } from '../theme/ui';
import { TYPE } from '../theme/type';
import { APP_NAME, saleCardText } from '../services/sales';

// A thank-you card on one of the family's days (design-handoff/sale-cards.md):
// a title, two or three sentences, Share FeedWell and Close, and on the shared
// cards See our other apps. Drawn like What's New, as in LedgerWell.
export default function SaleCardModal({ card, onShare, onSeeOtherApps, onClose }) {
  const { theme } = useTheme();
  const { t, language, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const ui = useUi();
  const styles = useStyles(isRTL);
  const text = card ? saleCardText(card, language) : null;

  return (
    <Modal
      visible={!!text}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[ui.dialog, styles.card, { marginTop: insets.top + 16, marginBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            {/* A large accent icon circle */}
            <View style={styles.headerIcon}>
              <Ionicons name={text?.icon || 'gift-outline'} size={28} color={theme.colors.accentInk} />
            </View>
            <Text style={styles.title}>{text?.title}</Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.words}>{text?.body}</Text>
          </ScrollView>

          {/* Share in the main fill, See our other apps in the main tint, Close as text */}
          <View style={styles.actions}>
            <TouchableOpacity style={ui.primaryButton} onPress={onShare} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={18} color={theme.colors.onPrimary} />
              <Text style={ui.primaryLabel}>{t('sale.shareApp', { app: APP_NAME })}</Text>
            </TouchableOpacity>
            {text?.shared && (
              <TouchableOpacity style={ui.secondaryButton} onPress={onSeeOtherApps}>
                <Text style={ui.secondaryLabel}>{t('sale.seeOtherApps')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeLabel}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Built once per theme and direction, as What's New's
const useStyles = makeStyles(({ colors: c }) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // A dialog (ui.dialog): the surface, radius 20
  card: {
    width: '100%',
    maxWidth: 420,
    flexShrink: 1,
    overflow: 'hidden',
    ...(c.amoled ? { borderWidth: 1, borderColor: c.cardBorder } : null),
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPE.title,
    color: c.text,
    textAlign: 'center',
    marginTop: 12,
  },
  body: {
    paddingHorizontal: 22,
    flexShrink: 1,
  },
  bodyContent: {
    paddingTop: 10,
    paddingBottom: 18,
  },
  words: {
    ...TYPE.body,
    fontSize: 15,
    lineHeight: 22,
    color: c.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: 8,
    padding: 16,
    paddingTop: 4,
  },
  closeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    ...TYPE.button,
    color: c.mainInk,
  },
}));
