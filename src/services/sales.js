import { useEffect, useState } from 'react';
import { AppState, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import calendarFile from '../config/sale-calendar.json';
import { tStatic } from '../i18n';
import { localDigits } from '../utils/digits';
import { formatDayMonth } from '../utils/formatDate';
import { countedKey } from '../utils/plural';
import { DEBUG_TODAY_KEY, SALE_CARDS_KEY } from '../config/backupKeys';

// The ProjectWell sale campaigns (design-handoff/sale-cards.md), as LedgerWell
// has them. Every app carries the same calendar file, made from the family
// page and copied in as it is on each release; nothing is fetched. During a
// sibling's sale, More from SeMo Lab tags it with its discount; on FeedWell's
// own days and the shared ones a thank-you card opens once.

export const APP_SLUG = 'feedwell';
export const APP_NAME = 'FeedWell';
export const STORE_LINK = 'https://play.google.com/store/apps/details?id=com.feedwell.app';

const CALENDAR = calendarFile.apps;

const pad2 = (n) => String(n).padStart(2, '0');
const dayKeyOf = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// ---- Today

// A debug build can pretend to be another day, to check the cards and tags
// without touching the phone's clock: open feedwell://debug/today/2027-04-16
// (feedwell://debug/today/clear goes back to the phone's date). Release
// builds always use the phone's date.
let debugToday = null;
let debugDaysSet = 0;
const debugListeners = new Set();

/** Debug builds: reads the pretend day kept from an earlier run */
export async function loadDebugToday() {
  if (!__DEV__) return;
  const setBefore = debugDaysSet;
  try {
    const kept = await AsyncStorage.getItem(DEBUG_TODAY_KEY);
    // A day set while this was reading (the link that opened the app) wins
    if (debugDaysSet === setBefore) debugToday = kept;
  } catch (e) {
    if (debugDaysSet === setBefore) debugToday = null;
  }
}

/** Debug builds: pretend today is `value` (YYYY-MM-DD), or the phone's date again with 'clear' */
export async function setDebugToday(value) {
  if (!__DEV__) return;
  debugDaysSet += 1;
  debugToday = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  try {
    if (debugToday) await AsyncStorage.setItem(DEBUG_TODAY_KEY, debugToday);
    else await AsyncStorage.removeItem(DEBUG_TODAY_KEY);
  } catch (e) { /* kept for this run only */ }
  debugListeners.forEach((listener) => listener());
}

/** Debug builds: called when the pretend day changes; returns its removal */
export function onDebugToday(listener) {
  debugListeners.add(listener);
  return () => debugListeners.delete(listener);
}

/** Today as the calendar reads it: the phone's local date */
export function todayKey() {
  if (__DEV__ && debugToday) return debugToday;
  return dayKeyOf(new Date());
}

/** Today, again whenever the app comes back to the front (and, in debug builds, when the pretend day changes) */
export function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const removeDebug = onDebugToday(refresh);
    return () => {
      subscription.remove();
      removeDebug();
    };
  }, []);
  return today;
}

// ---- Discounts

/** The sale an app runs on a day, if any: from its first day to its last, both included */
export function saleOn(app, today = todayKey()) {
  return CALENDAR[app]?.sales.find((sale) => sale.start <= today && today <= sale.end) ?? null;
}

// Each language's percent and signed-number layout, from Unicode CLDR as
// LedgerWell's numberLocalization.ts writes them: "50%", "50 %", "%50",
// "٥٠٪". The marks keep a right-to-left number in order.
const PERCENT_LAYOUT = {
  ar: { percent: '{n}٪؜', signed: '؜{s}{n}' },
  fa: { percent: '{n}٪', signed: '‎{s}{n}' },
  he: { percent: '{n}%', signed: '‎{s}{n}' },
  tr: { percent: '%{n}', signed: '{s}{n}' },
};
for (const language of ['cs', 'da', 'de', 'es', 'fi', 'fr', 'ro', 'ru', 'sv']) {
  PERCENT_LAYOUT[language] = { percent: '{n} %', signed: '{s}{n}' };
}
const layoutOf = (language) => PERCENT_LAYOUT[language] || { percent: '{n}%', signed: '{s}{n}' };

/** A percentage in the language's digits and layout: 50%, 50 %, %50, ٥٠٪ */
export function formatPercent(value, language) {
  return layoutOf(language).percent.replace('{n}', localDigits(String(value), language));
}

/** A sibling's discount in More from SeMo Lab: −50%, a minus sign before the percentage */
export function saleTag(percent, language) {
  return layoutOf(language).signed.replace('{s}', '−').replace('{n}', formatPercent(percent, language));
}

// ---- Which card opens

const idOf = (event) => `${event.date}:${event.card}`;

/**
 * The card to open today, if any, given those already opened. On its event's
 * day a card opens with its "today" words; if the app wasn't opened that day,
 * on the first open later while the sale runs, with its "later" words; never
 * after the sale. A card with no sale opens only on its day. When two events
 * of one sale are both waiting, only the later one's card opens: it mentions
 * the earlier one, which then counts as opened too.
 */
export function pickCard(today, opened, app = APP_SLUG) {
  const own = CALENDAR[app];
  if (!own) return null;

  const sale = own.sales.find((s) => s.start <= today && today <= s.end) ?? null;
  const come = (sale?.events ?? [])
    .filter((event) => event.card && event.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = come[come.length - 1];
  const fromSale = sale && latest && !opened.has(idOf(latest))
    ? {
        id: idOf(latest),
        card: latest.card,
        date: latest.date,
        later: latest.date < today,
        sale,
        years: latest.years,
        covers: come.map(idOf),
      }
    : null;

  const day = own.cards.find((c) => c.date === today && !opened.has(idOf(c)));
  const fromDay = day
    ? { id: idOf(day), card: day.card, date: day.date, later: false, sale: null, years: day.years, covers: [idOf(day)] }
    : null;

  // A card for today comes before a sale card opening late
  if (fromSale && !fromSale.later) return fromSale;
  return fromDay ?? fromSale;
}

async function readState() {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(SALE_CARDS_KEY)) || 'null');
    if (parsed && Array.isArray(parsed.opened)) {
      return { opened: parsed.opened.filter((id) => typeof id === 'string'), lastDay: parsed.lastDay ?? null };
    }
  } catch (e) {
    // Read again as empty: at worst a card opens once more
  }
  return { opened: [], lastDay: null };
}

/** The card to open now, or null: none today, or one has opened today already */
export async function nextSaleCard() {
  const today = todayKey();
  const state = await readState();
  if (state.lastDay === today) return null;
  return pickCard(today, new Set(state.opened));
}

/** Kept as soon as a card opens, so it opens once even if the app is closed with it showing */
export async function markCardOpened(card) {
  const state = await readState();
  const opened = Array.from(new Set([...state.opened, ...card.covers])).slice(-60);
  await AsyncStorage.setItem(SALE_CARDS_KEY, JSON.stringify({ opened, lastDay: todayKey() }));
}

/** Debug builds: forget the cards that have opened, to see them again (feedwell://debug/cards/clear) */
export async function clearSaleCards() {
  if (!__DEV__) return;
  try {
    await AsyncStorage.removeItem(SALE_CARDS_KEY);
  } catch (e) { /* nothing kept to forget */ }
}

// ---- What a card says

// The shared cards: every app shows them, with See our other apps
const SHARED_CARDS = new Set([
  'black-friday',
  'new-year',
  'semolab-birthday',
  'world-science-day-for-peace-and-development',
]);

const ICONS = {
  'black-friday': 'pricetag-outline',
  'new-year': 'sparkles-outline',
  'semolab-birthday': 'gift-outline',
  'world-science-day-for-peace-and-development': 'flask-outline',
  'world-press-freedom-day': 'newspaper-outline',
  'release-anniversary': 'ribbon-outline',
  birthday: 'gift-outline',
};

/** The card's icon, title and words, with its numbers and dates filled in; shared adds See our other apps */
export function saleCardText(card, language) {
  const t = (key, vars) => tStatic(key, language, vars);
  const counted = (key, n, vars) => t(countedKey(key, n, language), { ...vars, years: localDigits(String(n), language) });
  const sale = card.sale;
  const vars = {
    app: APP_NAME,
    percent: sale ? formatPercent(sale.percent, language) : '',
    lastDay: sale ? formatDayMonth(sale.end, language) : '',
    date: formatDayMonth(card.date, language),
  };
  const years = card.years ?? 1;

  let title;
  let sentences;
  switch (card.card) {
    case 'black-friday':
      title = t('sale.blackFridayTitle', vars);
      sentences = [t('sale.blackFridayBody', vars)];
      break;
    case 'new-year':
      title = t('sale.newYearTitle', vars);
      sentences = [t('sale.newYearBody', vars)];
      break;
    case 'world-science-day-for-peace-and-development':
      title = t('sale.scienceDayTitle', vars);
      sentences = [t('sale.scienceDayBody', vars)];
      break;
    case 'semolab-birthday': {
      // Earth Day ends the week: the event without a card of its own
      const earthDay = sale?.events.find((event) => event.card === null)?.date ?? sale?.end ?? card.date;
      title = t('sale.semolabTitle', vars);
      sentences = [
        counted(card.later ? 'sale.semolabLater' : 'sale.semolabToday', years, vars),
        t('sale.semolabBody', { ...vars, earthDay: formatDayMonth(earthDay, language) }),
      ];
      break;
    }
    case 'release-anniversary':
      title = counted('sale.anniversaryTitle', years, vars);
      sentences = [
        counted(card.later ? 'sale.anniversaryLater' : 'sale.anniversaryToday', years, vars),
        t('sale.anniversaryBody', vars),
      ];
      break;
    case 'birthday':
      title = t('sale.birthdayTitle', vars);
      sentences = [
        counted(card.later ? 'sale.birthdayLater' : 'sale.birthdayToday', years, vars),
        t('sale.birthdayBody', vars),
      ];
      break;
    case 'world-press-freedom-day':
      title = t('sale.pressFreedomTitle', vars);
      sentences = [t('sale.pressFreedomBody', vars)];
      break;
    default:
      return null;
  }
  // Sentences run on with a space, as the language writes them: Chinese and
  // Japanese put none after their full stops
  const joiner = language === 'zh' || language === 'ja' ? '' : ' ';
  return {
    icon: ICONS[card.card] || 'gift-outline',
    title,
    body: sentences.filter(Boolean).join(joiner),
    shared: SHARED_CARDS.has(card.card),
  };
}

/** Share FeedWell: its store link through the phone's share sheet */
export async function shareApp() {
  await Share.share({ message: STORE_LINK, title: APP_NAME });
}
