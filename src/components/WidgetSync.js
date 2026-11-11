import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useFeed } from '../context/FeedContext';
import { useReadLater } from '../context/ReadLaterContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../context/LanguageContext';
import { updateWidget, updateWidgetLanguage, widgetArticles } from '../utils/widgetService';

/**
 * Keeps the Android home screen widget in step with the app: the articles it
 * is set to show (every one, the unread or the saved ones, from one feed or
 * all of them) and the words it writes, in the app's language. Renders nothing.
 */
export default function WidgetSync() {
  const { articles, feeds, isInitialized } = useFeed();
  const { articles: savedArticles, loading: savedLoading } = useReadLater();
  const { widgetSource, widgetFeedUrl, isLoading: settingsLoading } = useAppSettings();
  const { language, langLoading } = useTranslation();
  const android = Platform.OS === 'android';

  useEffect(() => {
    if (!android || langLoading || settingsLoading) return;
    updateWidgetLanguage(language, widgetSource);
  }, [android, language, langLoading, settingsLoading, widgetSource]);

  // A refresh changes the articles many times in a row: one hand-over for the lot
  useEffect(() => {
    if (!android || !isInitialized || settingsLoading) return undefined;
    if (widgetSource === 'saved' && savedLoading) return undefined;
    const timer = setTimeout(() => {
      updateWidget(
        widgetArticles({ articles, savedArticles, feeds, source: widgetSource, feedUrl: widgetFeedUrl }),
        feeds
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [android, isInitialized, settingsLoading, savedLoading, articles, savedArticles, feeds, widgetSource, widgetFeedUrl]);

  return null;
}
