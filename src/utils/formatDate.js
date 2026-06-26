// Localized date/time formatting.
// - Relative time ("Just now", "3h ago") via the i18n `t` function.
// - Absolute dates: for Farsi, the Solar Hijri (Jalali) calendar with Farsi month
//   names + Persian digits; for other languages, the platform locale formatting.
import { toPersianDigits } from './persianDigits';

const identity = (x) => String(x);

const FA_JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// Gregorian -> Jalali (Solar Hijri). Standard conversion algorithm.
function gregorianToJalali(gy, gm, gd) {
  const gDaysToMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) + gd + gDaysToMonth[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm;
  let jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

const pad2 = (n) => String(n).padStart(2, '0');

// Absolute, localized date. Farsi -> Jalali calendar + Persian digits + 24h time.
// opts: { withYear=true, withTime=true, locale='en-US', localeOptions=null }
// For non-Farsi the original `toLocaleDateString(locale, localeOptions)` is used so
// existing per-screen formats are preserved.
export function formatLocalizedDate(dateString, language, formatNumber = identity, opts = {}) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';

  const { withYear = true, withTime = true, locale = 'en-US', localeOptions = null } = opts;

  if (language === 'fa') {
    const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    let s = `${jd} ${FA_JALALI_MONTHS[jm - 1]}`;
    if (withYear) s += ` ${jy}`;
    if (withTime) s += ` - ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    return toPersianDigits(s);
  }

  try {
    const out = localeOptions
      ? d.toLocaleDateString(locale, localeOptions)
      : d.toLocaleDateString(locale);
    return formatNumber(out);
  } catch (e) {
    return formatNumber(d.toLocaleDateString());
  }
}

// Relative time, localized. `language` is used only for the >1 week absolute fallback.
export function formatRelativeDate(dateString, t, formatNumber = identity, language) {
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
  return formatLocalizedDate(dateString, language, formatNumber, { withTime: false });
}

export default formatRelativeDate;
