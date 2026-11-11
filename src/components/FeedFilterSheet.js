import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeStyles } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { useUi, Segmented } from '../theme/ui';
import { FONT, TYPE } from '../theme/type';
import { countedKey } from '../utils/plural';
import { PUBLISHED_RANGES, ONLY_CHOICES, feedFilterCount } from '../config/feedFilter';
import { DragSheet, SheetDragArea } from './DragSheet';

const PUBLISHED_KEYS = { today: 'feedFilter.today', week: 'feedFilter.week', month: 'feedFilter.month' };
const ONLY_INFO = {
  saved: { key: 'feedFilter.saved', icon: 'bookmark-outline' },
  notes: { key: 'feedFilter.notes', icon: 'create-outline' },
  starred: { key: 'feedFilter.starred', icon: 'star-outline' },
  images: { key: 'feedFilter.images', icon: 'image-outline' },
};

/** The words for one published range and one "show only" choice, for the list's filter bar too */
export const publishedLabelKey = (range) => PUBLISHED_KEYS[range];
export const onlyLabelKey = (choice) => ONLY_INFO[choice]?.key;

/**
 * The Feeds list's filter, as TuneWell's library filter: read or unread, then
 * groups of choices, each showing how many articles it would bring. Any of the
 * feeds picked; one stretch of time; and each "show only" choice on top.
 *
 * counts: { status: {all, unread, read}, published: {today, week, month},
 * only: {saved, notes, starred, images}, feeds: [{url, title, count, total}] },
 * where each count is what the choice brings with the rest of the filter on;
 * publishedAll, onlyAll and each feed's total are the same with nothing else
 * picked, which decides the choices on show. matching is the number of
 * articles the list shows with all of it.
 */
export default function FeedFilterSheet({ visible, onClose, status, onStatusChange, filter, onFilterChange, counts }) {
  const { theme } = useTheme();
  const { t, isRTL, formatNumber, language } = useTranslation();
  const ui = useUi();
  const styles = useStyles(isRTL);
  const insets = useSafeAreaInsets();
  const colors = theme.colors;
  const active = feedFilterCount(filter);

  const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  // A choice that would bring nothing with the rest of the filter stays in
  // its place, faded, so the chips never move while picking
  const chip = ({ key, label, count, selected, onPress, icon }) => (
    <TouchableOpacity
      key={key}
      style={[ui.chip, selected && ui.chipSelected, !selected && count === 0 && styles.chipEmpty]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {selected ? (
        <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
      ) : icon ? (
        <Ionicons name={icon} size={15} color={colors.textSecondary} />
      ) : null}
      <Text style={[ui.chipLabel, selected && ui.chipLabelSelected, styles.chipLabel]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.chipCount, selected && styles.chipCountSelected]}>{formatNumber(count)}</Text>
    </TouchableOpacity>
  );

  const groupTitle = (title) => <Text style={[ui.sectionTitle, styles.groupTitle]}>{title}</Text>;

  // A choice no article has stays out, unless it is picked
  const feedChoices = counts.feeds.filter((feed) => feed.total > 0 || filter.feeds.includes(feed.url));
  const publishedChoices = PUBLISHED_RANGES.filter((range) => counts.publishedAll[range] > 0 || filter.published === range);
  const onlyChoices = ONLY_CHOICES.filter((choice) => counts.onlyAll[choice] > 0 || filter.only.includes(choice));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <DragSheet onClose={onClose} style={[ui.sheet, styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          <SheetDragArea>
            <View style={ui.sheetHandle} />
            <View style={styles.header}>
              <Text style={[ui.title, styles.flexText]}>{t('feedFilter.title')}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </SheetDragArea>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {groupTitle(t('feedFilter.articles'))}
            <Segmented
              framed
              options={[
                { value: 'all', label: t('feedList.filterAllCount', { count: formatNumber(counts.status.all) }) },
                { value: 'unread', label: t('feedList.filterUnread', { count: formatNumber(counts.status.unread) }) },
                { value: 'read', label: t('feedList.filterRead', { count: formatNumber(counts.status.read) }) },
              ]}
              value={status}
              onChange={onStatusChange}
            />

            {publishedChoices.length > 0 && (
              <>
                {groupTitle(t('feedFilter.published'))}
                <View style={styles.chipRow}>
                  {publishedChoices.map((range) => chip({
                    key: range,
                    label: t(PUBLISHED_KEYS[range]),
                    count: counts.published[range],
                    selected: filter.published === range,
                    icon: 'calendar-outline',
                    onPress: () => onFilterChange({ ...filter, published: filter.published === range ? 'any' : range }),
                  }))}
                </View>
              </>
            )}

            {onlyChoices.length > 0 && (
              <>
                {groupTitle(t('feedFilter.only'))}
                <View style={styles.chipRow}>
                  {onlyChoices.map((choice) => chip({
                    key: choice,
                    label: t(ONLY_INFO[choice].key),
                    count: counts.only[choice],
                    selected: filter.only.includes(choice),
                    icon: ONLY_INFO[choice].icon,
                    onPress: () => onFilterChange({ ...filter, only: toggle(filter.only, choice) }),
                  }))}
                </View>
              </>
            )}

            {feedChoices.length > 0 && (
              <>
                {groupTitle(t('tab.feeds'))}
                <View style={styles.chipRow}>
                  {feedChoices.map((feed) => chip({
                    key: feed.url,
                    label: feed.title || feed.url,
                    count: feed.count,
                    selected: filter.feeds.includes(feed.url),
                    icon: feed.isHidden ? 'eye-off-outline' : null,
                    onPress: () => onFilterChange({ ...filter, feeds: toggle(filter.feeds, feed.url) }),
                  }))}
                </View>
              </>
            )}
          </ScrollView>

          <Text style={[ui.secondary, styles.summary]}>
            {t(countedKey('feedFilter.matching', counts.matching, language), { count: formatNumber(counts.matching) })}
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[ui.secondaryButton, styles.button, !active && styles.disabled]}
              onPress={() => onFilterChange({ feeds: [], published: 'any', only: [] })}
              disabled={!active}
            >
              <Text style={ui.secondaryLabel} numberOfLines={1}>{t('feedFilter.clear')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ui.primaryButton, styles.button]} onPress={onClose}>
              <Text style={ui.primaryLabel} numberOfLines={1}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </DragSheet>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors: c }, isRTL) => {
  const row = isRTL ? 'row-reverse' : 'row';
  return {
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '85%',
    },
    header: {
      flexDirection: row,
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
    },
    flexText: {
      flex: 1,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    groupTitle: {
      marginTop: 16,
      marginBottom: 10,
    },
    chipRow: {
      flexDirection: row,
      flexWrap: 'wrap',
      gap: 8,
    },
    chipLabel: {
      flexShrink: 1,
      maxWidth: 220,
    },
    chipEmpty: {
      opacity: 0.45,
    },
    chipCount: {
      ...TYPE.count,
      fontSize: 12,
      color: c.textSecondary,
    },
    chipCountSelected: {
      color: c.onPrimary,
    },
    summary: {
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 12,
      fontFamily: FONT.medium,
    },
    buttons: {
      flexDirection: row,
      gap: 10,
      paddingHorizontal: 20,
    },
    button: {
      flex: 1,
    },
    disabled: {
      opacity: 0.5,
    },
  };
});
