import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { APP_VERSION } from '../config/version';

// One-time "What's New" popup shown after the app is updated to a new version.
export default function WhatsNewModal({ visible, onClose, onOpenLanguageSettings }) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const Feature = ({ icon, title, body }) => (
    <View style={[styles.feature, { flexDirection: rowDir }]}>
      <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '1A' }]}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: theme.colors.text, textAlign }]}>{title}</Text>
        <Text style={[styles.featureBody, { color: theme.colors.textSecondary, textAlign }]}>{body}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.header, { backgroundColor: theme.colors.primary + '14' }]}>
            <Ionicons name="sparkles" size={28} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('whatsNew.title')}</Text>
            <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
              {t('whatsNew.version', { version: APP_VERSION.version })}
            </Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Feature
              icon="language"
              title={t('whatsNew.languagesTitle')}
              body={t('whatsNew.languagesBody')}
            />
            <Feature
              icon="newspaper"
              title={t('whatsNew.feedsTitle')}
              body={t('whatsNew.feedsBody')}
            />
            <Text style={[styles.hint, { color: theme.colors.textSecondary, textAlign }]}>
              {t('whatsNew.changeHint')}
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
              onPress={onOpenLanguageSettings}
            >
              <Text style={styles.primaryBtnText}>{t('whatsNew.openLanguageSettings')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
                {t('common.gotIt')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  version: {
    fontSize: 13,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingVertical: 16,
  },
  feature: {
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  featureBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: {
    padding: 16,
    paddingTop: 4,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
})
