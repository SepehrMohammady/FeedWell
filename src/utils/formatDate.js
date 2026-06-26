// Centralized relative-time formatting, localized via the i18n `t` function and
// with locale-aware digits (Persian digits when app language is Farsi).
// Replaces the per-screen hardcoded copies. Pass `t` and `formatNumber` from
// useTranslation().

const identity = (x) => String(x);

export function formatRelativeDate(dateString, t, formatNumber = identity) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return t('date.justNow');
  } else if (diffHours < 24) {
    return t('date.hoursAgo', { count: formatNumber(diffHours) });
  } else if (diffDays < 7) {
    return t('date.daysAgo', { count: formatNumber(diffDays) });
  }
  return formatNumber(date.toLocaleDateString());
}

export default formatRelativeDate;
