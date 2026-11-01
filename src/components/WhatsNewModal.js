import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { useUi } from '../theme/ui';
import { TYPE } from '../theme/type';
import { WHATS_NEW_RELEASES } from '../config/whatsNew';

// One-time "What's New" popup shown after the app is updated to a new version.
// It lists the last two releases (see config/whatsNew.js).
export default function WhatsNewModal({ visible, onClose, onTakeTour }) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const ui = useUi();
  const styles = useStyles(isRTL);

  const Feature = ({ icon, title, body }) => (
    <View style={styles.feature}>
      <View style={ui.iconCircle}>
        <Ionicons name={icon} size={19} color={theme.colors.accentInk} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
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
              <Ionicons name="sparkles" size={28} color={theme.colors.accentInk} />
            </View>
            <Text style={styles.title}>{t('whatsNew.title')}</Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {WHATS_NEW_RELEASES.map((release, i) => (
              <View key={release.version} style={i > 0 ? styles.release : null}>
                {/* Each release's heading, a section title in accent ink */}
                <Text style={styles.releaseVersion}>
                  {t('whatsNew.version', { version: release.version })}
                </Text>
                {release.items.map((item) => (
                  <Feature key={item.body} icon={item.icon} title={t(item.title)} body={t(item.body)} />
                ))}
              </View>
            ))}
          </ScrollView>

          {/* The main action in the main fill, the other in the main tint */}
          <View style={styles.actions}>
            <TouchableOpacity style={ui.primaryButton} onPress={onTakeTour} activeOpacity={0.85}>
              <Text style={ui.primaryLabel}>{t('whatsNew.takeTour')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ui.secondaryButton} onPress={onClose}>
              <Text style={ui.secondaryLabel}>{t('common.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Built once per theme and direction (Calm Surfaces 3), as LedgerWell's
const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const textAlign = isRTL ? 'right' : 'left';
  return {
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
      paddingHorizontal: 20,
      flexShrink: 1,
    },
    bodyContent: {
      paddingVertical: 16,
    },
    release: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: 16,
    },
    releaseVersion: {
      ...TYPE.section,
      color: c.accentInk,
      marginBottom: 14,
      textAlign,
    },
    feature: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 16,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      ...TYPE.rowTitle,
      color: c.text,
      marginBottom: 3,
      textAlign,
    },
    featureBody: {
      ...TYPE.body,
      lineHeight: 20,
      color: c.textSecondary,
      textAlign,
    },
    actions: {
      gap: 8,
      padding: 16,
      paddingTop: 4,
    },
  };
});
