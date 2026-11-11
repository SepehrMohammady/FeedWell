// FeedWell's backup file, restoring, Clear All Data, Reset Settings and the
// automatic backup, in one place (the ProjectWell family backup rules,
// design-handoff/family-backup-spec.md).
//
// The file is a ZIP named FeedWell_Backup_YYYY-MM-DD_HH-MM.feedwell holding
// manifest.json, settings.json (every setting under its storage key, exactly as
// stored) and data.json (the records as JSON values). Older files, one JSON
// object from FeedWell 1.x, still restore through the old reader.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Zip, ZipDeflate, unzipSync, strToU8 } from 'fflate';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { SafeStorage } from '../utils/SafeStorage';
import { STORAGE_HEADROOM, STORAGE_LIMIT, storedSize } from '../utils/storageRoom';
import { APP_VERSION } from '../config/version';
import {
  AUTO_BACKUP_KEYS,
  DATA_KEYS,
  READING_BOOKMARK_PREFIX,
  baseKeyOf,
  kindOfKey,
} from '../config/backupKeys';

export const BACKUP_APP = 'FeedWell';
export const BACKUP_FORMAT = 1; // The family layout
export const BACKUP_SCHEMA = 1; // What FeedWell's settings.json and data.json hold
export const BACKUP_MIME = 'application/octet-stream'; // With a ZIP type Android may add .zip
const AUTO_BACKUP_KEEP = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Why a file can't be restored: 'otherApp' (details.app names it), 'newer'
 * (a later FeedWell made it), 'damaged' (a check failed), 'invalid' (not a
 * FeedWell backup at all) or 'noRoom' (its saved articles and notes alone
 * don't fit in the storage). A file that fails changes nothing.
 */
export class BackupError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

// ---- Names, times and checksums

const pad = (n) => String(n).padStart(2, '0');

/** FeedWell_Backup_2026-11-01_14-30.feedwell: local time, 24-hour clock, Latin digits */
export const backupFileName = (date = new Date()) =>
  `FeedWell_Backup_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `_${pad(date.getHours())}-${pad(date.getMinutes())}.feedwell`;

/** Local time with its offset, so it says the same time as the name: 2026-11-01T14:30:00+01:00 */
export const localIsoString = (date = new Date()) => {
  const offset = -date.getTimezoneOffset();
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${offset >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
};

const toHex = (buffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (bytes) => toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));

const parseJson = (text, fallback) => {
  if (text === null || text === undefined) return fallback;
  try {
    const value = JSON.parse(text);
    return value === null || value === undefined ? fallback : value;
  } catch (e) {
    return fallback;
  }
};
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// A few MB of data take seconds to pack or read, so the work goes in slices
// with a pause between them for the rest of the app: the automatic backup runs
// as FeedWell goes to the background, where Read Aloud may still be speaking,
// and someone may come straight back
const SLICE = 128 * 1024;
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

// UTF-8 to text, for reading a file. On Android fflate's strFromU8 goes through
// Expo's TextDecoder, which is plain JavaScript and takes most of a second for
// a few hundred KB of data.json. This fills a buffer of UTF-16 code units and
// turns it into text a chunk at a time, several times faster. A byte order
// mark at the start is skipped, as TextDecoder does.
async function textOf(bytes) {
  const CHUNK = 8192;
  const units = new Uint16Array(CHUNK + 1); // room for a surrogate pair at the end
  let text = '';
  let n = 0;
  let chunks = 0;
  let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) units[n++] = b;
    else if (b < 0xe0) units[n++] = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
    else if (b < 0xf0) units[n++] = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else {
      const point = (((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)) - 0x10000;
      units[n++] = 0xd800 | (point >> 10);
      units[n++] = 0xdc00 | (point & 0x3ff);
    }
    if (n >= CHUNK) {
      text += String.fromCharCode.apply(null, units.subarray(0, n));
      n = 0;
      if (++chunks % 32 === 0) await breathe();
    }
  }
  return text + String.fromCharCode.apply(null, units.subarray(0, n));
}

/** A ZIP of [name, bytes] pairs, in that order, deflated a slice at a time */
async function zipInSlices(files, mtime) {
  const parts = [];
  let failure = null;
  const zip = new Zip((error, chunk) => {
    if (error) failure = error;
    else parts.push(chunk);
  });
  for (const [name, bytes] of files) {
    const entry = new ZipDeflate(name, { level: 6 });
    entry.mtime = mtime;
    zip.add(entry);
    let at = 0;
    do {
      entry.push(bytes.subarray(at, at + SLICE), at + SLICE >= bytes.length);
      at += SLICE;
      await breathe();
    } while (at < bytes.length);
  }
  zip.end();
  if (failure) throw failure;
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// ---- Reading what the phone holds

async function allKeys() {
  return (await SafeStorage.getAllKeys()) || [];
}

/** Every setting as stored, under its storage key */
async function readSettings(keys) {
  const bases = [...new Set(keys.filter((key) => kindOfKey(key) === 'setting').map(baseKeyOf))].sort();
  const settings = {};
  for (const key of bases) {
    const value = await SafeStorage.getItem(key);
    if (typeof value === 'string') settings[key] = value;
  }
  return settings;
}

/** The records, each as FeedWell keeps it, parsed */
async function readData(keys) {
  const get = async (key, fallback) => parseJson(await SafeStorage.getItem(key), fallback);
  const bookmarkKeys = keys.filter((key) => key.startsWith(READING_BOOKMARK_PREFIX));
  const readingBookmarks = {};
  for (const [key, value] of await AsyncStorage.multiGet(bookmarkKeys)) {
    const bookmark = parseJson(value, null);
    if (bookmark) readingBookmarks[key.slice(READING_BOOKMARK_PREFIX.length)] = bookmark;
  }
  return {
    feeds: await get(DATA_KEYS.feeds, []),
    articles: await get(DATA_KEYS.articles, []),
    readLater: await get(DATA_KEYS.readLater, []),
    notes: await get(DATA_KEYS.notes, {}),
    readArticleUrls: await get(DATA_KEYS.readArticleUrls, []),
    readingPosition: await get(DATA_KEYS.readingPosition, null),
    readingBookmarks,
    removedArticles: await get(DATA_KEYS.removedArticles, []),
  };
}

const countsOf = (data) => ({
  feeds: Array.isArray(data.feeds) ? data.feeds.length : 0,
  articles: Array.isArray(data.articles) ? data.articles.length : 0,
  saved: Array.isArray(data.readLater) ? data.readLater.length : 0,
  notes: isObject(data.notes) ? Object.keys(data.notes).length : 0,
});

/** What would go into a backup now: the counts for Clear All Data's warning */
export async function currentCounts() {
  return countsOf(await readData(await allKeys()));
}

// ---- Making the file

/**
 * settings.json and data.json as bytes, with their SHA-256: what the
 * automatic backup compares to see whether anything changed, before it
 * spends time on the ZIP
 */
async function snapshot() {
  const keys = await allKeys();
  const settings = await readSettings(keys);
  const data = await readData(keys);
  const settingsBytes = strToU8(JSON.stringify(settings, null, 2));
  const dataBytes = strToU8(JSON.stringify(data));
  const hashes = { settings: await sha256(settingsBytes), data: await sha256(dataBytes) };
  return { counts: countsOf(data), settingsBytes, dataBytes, hashes };
}

/** The ZIP around a snapshot, with its name and manifest. The slow part: over a second for 1 MB of data.json. */
async function zipSnapshot({ counts, settingsBytes, dataBytes, hashes }, { automatic = false, date = new Date() } = {}) {
  const manifest = {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    schema: BACKUP_SCHEMA,
    appVersion: APP_VERSION.version,
    createdAt: localIsoString(date),
    automatic,
    counts,
    sha256: { 'settings.json': hashes.settings, 'data.json': hashes.data },
  };
  // In this order: the manifest first, as it is read first
  const bytes = await zipInSlices(
    [
      ['manifest.json', strToU8(JSON.stringify(manifest, null, 2))],
      ['settings.json', settingsBytes],
      ['data.json', dataBytes],
    ],
    date
  );
  return {
    bytes,
    name: backupFileName(date),
    manifest,
    hashes,
    jsonSize: settingsBytes.length + dataBytes.length,
  };
}

/**
 * The backup as bytes, built in memory, with its name, manifest and the
 * SHA-256 of settings.json and data.json. Options: automatic, date.
 */
export async function createBackup(options) {
  return zipSnapshot(await snapshot(), options);
}

/** Android: a copy for the share sheet, in the cache directory. One at a time: earlier shares' copies go. */
export function writeShareCopy(backup) {
  try {
    for (const item of Paths.cache.list()) {
      if (item instanceof File && /^FeedWell_Backup_.+\.feedwell$/.test(item.name)) item.delete();
    }
  } catch (e) { /* they stay until Android clears the cache */ }
  const file = new File(Paths.cache, backup.name);
  if (file.exists) file.delete();
  file.create();
  file.write(backup.bytes);
  return file.uri;
}

/** Web: the file as a download, under the same name */
export function downloadOnWeb(backup) {
  const blob = new Blob([backup.bytes], { type: BACKUP_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backup.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---- Reading a file

// The 14 settings FeedWell 1.x wrote into its JSON backups, and the storage
// keys they belong under, in the form the app stores them.
const LEGACY_SETTINGS = [
  ['showImages', 'showImages', 'boolean'],
  ['autoRefresh', 'autoRefresh', 'boolean'],
  ['maxArticleAge', 'maxArticleAge', 'number'],
  ['reduceMotion', 'reduceMotion', 'boolean'],
  ['readingReminder', 'readingReminder', 'boolean'],
  ['showBookmarkIndicators', 'showBookmarkIndicators', 'boolean'],
  ['skipArticleView', 'skipArticleView', 'boolean'],
  ['showReadingPositionInFeeds', 'showReadingPositionInFeeds', 'boolean'],
  ['allowRotation', 'allowRotation', 'boolean'],
  ['speechRate', 'speechRate', 'number'],
  ['readerHeaderActions', 'readerHeaderActions', 'array'],
];

/** A file from FeedWell 1.x: one JSON object with feeds, articles and a few settings */
async function readLegacyBackup(bytes) {
  let backup;
  try {
    backup = JSON.parse(await textOf(bytes));
  } catch (e) {
    throw new BackupError('invalid');
  }
  if (!isObject(backup) || !Array.isArray(backup.feeds) || !Array.isArray(backup.articles)) {
    throw new BackupError('invalid');
  }
  const old = isObject(backup.settings) ? backup.settings : {};
  const settings = {};
  for (const [field, key, type] of LEGACY_SETTINGS) {
    const value = old[field];
    if (type === 'array' ? Array.isArray(value) : typeof value === type) settings[key] = JSON.stringify(value);
  }
  // Its dark mode switch becomes Light or Dark
  if (typeof old.isDarkMode === 'boolean') settings.theme = old.isDarkMode ? 'dark' : 'light';
  if (typeof old.targetLangCode === 'string' && old.targetLangCode) {
    settings.feedwell_translation_target_language = old.targetLangCode;
  }
  if (typeof old.translationMode === 'string' && old.translationMode) {
    settings.feedwell_translation_mode = old.translationMode;
  }
  // Only what it holds: the phone keeps its notes, reading positions and
  // every other setting
  const data = { feeds: backup.feeds, articles: backup.articles };
  if (Array.isArray(backup.readLater)) data.readLater = backup.readLater;
  if (Array.isArray(backup.removedArticles)) data.removedArticles = backup.removedArticles;
  return {
    kind: 'legacy',
    createdAt: typeof backup.timestamp === 'string' ? backup.timestamp : null,
    counts: countsOf(data),
    settings,
    data,
  };
}

/** The records of a family file, each kind checked for its shape */
function familyData(data) {
  const out = {};
  for (const kind of ['feeds', 'articles', 'readLater', 'readArticleUrls', 'removedArticles']) {
    if (Array.isArray(data[kind])) out[kind] = data[kind];
  }
  for (const kind of ['notes', 'readingBookmarks']) {
    if (isObject(data[kind])) out[kind] = data[kind];
  }
  if ('readingPosition' in data && (data.readingPosition === null || isObject(data.readingPosition))) {
    out.readingPosition = data.readingPosition;
  }
  return out;
}

/**
 * Reads and checks a backup file, given as bytes. Recognizes it by what is
 * inside: a ZIP holding a manifest.json is the family file, anything else goes
 * to the old reader. Throws a BackupError if it can't be restored.
 */
export async function readBackup(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new BackupError('invalid');
  if (bytes.length < 2 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return readLegacyBackup(bytes);

  let entries;
  try {
    entries = unzipSync(bytes);
  } catch (e) {
    throw new BackupError('damaged');
  }
  if (!entries['manifest.json']) throw new BackupError('invalid'); // FeedWell never wrote another kind of ZIP

  let manifest;
  try {
    manifest = JSON.parse(await textOf(entries['manifest.json']));
  } catch (e) {
    throw new BackupError('damaged');
  }
  if (!isObject(manifest)) throw new BackupError('damaged');
  if (manifest.app !== BACKUP_APP) {
    throw new BackupError('otherApp', { app: typeof manifest.app === 'string' ? manifest.app : null });
  }
  if (!Number.isInteger(manifest.format) || !Number.isInteger(manifest.schema)) throw new BackupError('damaged');
  if (manifest.format > BACKUP_FORMAT || manifest.schema > BACKUP_SCHEMA) throw new BackupError('newer');

  // Every file in the ZIP but the manifest matches its SHA-256
  if (!entries['settings.json'] || !entries['data.json'] || !isObject(manifest.sha256)) throw new BackupError('damaged');
  for (const [name, content] of Object.entries(entries)) {
    if (name === 'manifest.json' || name.endsWith('/')) continue;
    if (manifest.sha256[name] !== (await sha256(content))) throw new BackupError('damaged');
  }

  let settings;
  let data;
  try {
    settings = JSON.parse(await textOf(entries['settings.json']));
    data = JSON.parse(await textOf(entries['data.json']));
  } catch (e) {
    throw new BackupError('damaged');
  }
  if (!isObject(settings) || !isObject(data)) throw new BackupError('damaged');

  // Settings stay strings, as stored; nothing that belongs to data or to the
  // phone comes in through them
  const cleanSettings = {};
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'string' && kindOfKey(key) === 'setting') cleanSettings[key] = value;
  }
  const cleanData = familyData(data);
  return {
    kind: 'family',
    createdAt: typeof manifest.createdAt === 'string' ? manifest.createdAt : null,
    counts: isObject(manifest.counts) ? { ...countsOf(cleanData), ...manifest.counts } : countsOf(cleanData),
    automatic: manifest.automatic === true,
    settings: cleanSettings,
    data: cleanData,
  };
}

// ---- Applying a restore
//
// A restore fits what it writes into the room the storage has (STORAGE_LIMIT),
// so a backup never fails for its size. It measures everything first. When the
// records don't fit, as after a Merge or on a phone that keeps more of its
// own, the oldest feed articles are left out; saved articles and notes always
// come whole. Only if those alone can't fit does it refuse, before writing
// anything. Then it makes room, what gives way going first, and writes; if a
// write still fails, what it touched is put back.

// SafeStorage answers a failed write with false: stop rather than report a
// restore that didn't happen
const writeText = async (key, text) => {
  if (!(await SafeStorage.setItem(key, text))) throw new Error(`Couldn't save ${key}`);
};
const writeJson = (key, value) => writeText(key, JSON.stringify(value));

async function removeKeys(keys) {
  const bases = [...new Set(keys.map(baseKeyOf))];
  for (const key of bases) await SafeStorage.removeItem(key);
}

const pairSize = (key, text) => storedSize(key) + storedSize(text);
const sizeOfPairs = (pairs) => pairs.reduce((total, [key, text]) => total + pairSize(key, text), 0);

/** The given keys with their values as stored, chunks included */
async function storedPairs(keys) {
  const pairs = [];
  for (let i = 0; i < keys.length; i += 20) {
    for (const [key, value] of await AsyncStorage.multiGet(keys.slice(i, i + 20))) {
      if (value !== null && value !== undefined) pairs.push([key, value]);
    }
  }
  return pairs;
}

/** The room the given keys take in storage now */
const storedSizeOf = async (keys) => sizeOfPairs(await storedPairs(keys));

/**
 * Runs the writes of a restore. If one fails half way (the phone's own
 * storage full, say), every key the restore touches is put back as it was,
 * and the error goes on.
 */
async function writeOrPutBack(touches, write) {
  const before = await storedPairs((await allKeys()).filter(touches));
  try {
    await write();
  } catch (error) {
    try {
      await AsyncStorage.multiRemove((await allKeys()).filter(touches));
      if (before.length) await AsyncStorage.multiSet(before);
    } catch (e) {
      console.warn('Restore: putting the phone back failed:', e?.message);
    }
    throw error;
  }
}

// The records whose contexts keep a safety copy (<key>_backup) of what they
// last saved: the copy comes back at their next save, so it needs room too
const COPIED_RECORDS = [DATA_KEYS.readLater, DATA_KEYS.notes];
const SAFETY_SUFFIX = '_backup';

/** A key that is a record's safety copy, or a piece of one, from this version or an older one */
const safetyCopyOf = (key) => {
  const base = baseKeyOf(key);
  return base.endsWith(SAFETY_SUFFIX) ? base.slice(0, -SAFETY_SUFFIX.length) : null;
};

/** The newest articles that fit in `room` once stored, in the order they came */
function newestThatFit(articles, room) {
  const order = articles
    .map((article, index) => ({
      index,
      time: Date.parse(article && article.publishedDate) || 0,
      size: storedSize(JSON.stringify(article)) + 1,
    }))
    .sort((a, b) => b.time - a.time);
  const keep = new Set();
  let used = 2;
  for (const item of order) {
    if (used + item.size > room) break;
    used += item.size;
    keep.add(item.index);
  }
  const kept = articles.filter((article, index) => keep.has(index));
  return { text: JSON.stringify(kept), leftOut: articles.length - kept.length };
}

/**
 * Fits the records (key to JSON text) into the storage next to `others`, the
 * room everything else takes once the restore is done. Leaves out the oldest
 * articles if it must and says how many; throws BackupError('noRoom') if
 * nothing but articles can go and that's not enough.
 */
function fitRecords(records, articles, others) {
  const copies = COPIED_RECORDS.reduce((total, key) => total + (key in records ? pairSize(key + SAFETY_SUFFIX, records[key]) : 0), 0);
  const recordsBesideArticles = sizeOfPairs(Object.entries(records).filter(([key]) => key !== DATA_KEYS.articles));
  const room = STORAGE_LIMIT - STORAGE_HEADROOM - others - copies - recordsBesideArticles;
  if (!(DATA_KEYS.articles in records)) {
    if (room < 0) throw new BackupError('noRoom');
    return 0;
  }
  const articlesRoom = room - storedSize(DATA_KEYS.articles);
  if (storedSize(records[DATA_KEYS.articles]) <= articlesRoom) return 0;
  if (articlesRoom < 2) throw new BackupError('noRoom');
  const fit = newestThatFit(articles, articlesRoom);
  records[DATA_KEYS.articles] = fit.text;
  return fit.leftOut;
}

const bookmarkPairsOf = (bookmarks) =>
  Object.entries(bookmarks)
    .filter(([id, bookmark]) => id && isObject(bookmark))
    .map(([id, bookmark]) => [READING_BOOKMARK_PREFIX + id, JSON.stringify(bookmark)]);

/** The records the file holds, as the text each is stored as, the articles first */
function recordTextsOf(data) {
  const records = {};
  for (const kind of ['articles', 'feeds', 'readLater', 'notes', 'readArticleUrls', 'removedArticles']) {
    if (data[kind] !== undefined) records[DATA_KEYS[kind]] = JSON.stringify(data[kind]);
  }
  return records;
}

/**
 * Replace: the file's data and settings take the place of the phone's.
 * Returns { leftOut }, the number of the file's oldest articles that didn't fit.
 */
async function replaceWith(backup) {
  const { data, settings } = backup;
  const keys = await allKeys();
  const records = recordTextsOf(data);
  const bookmarks = data.readingBookmarks ? bookmarkPairsOf(data.readingBookmarks) : null;
  const position = 'readingPosition' in data && data.readingPosition ? JSON.stringify(data.readingPosition) : null;
  const settingPairs = Object.entries(settings);

  // What gives way: the records the file brings and their safety copies, the
  // reading position and bookmarks when the file has its own, and the
  // settings: all of them for a family file, which holds them all, and for an
  // old file the few it holds
  const replaced = new Set(Object.keys(records));
  if ('readingPosition' in data) replaced.add(DATA_KEYS.readingPosition);
  const goes = (key) =>
    replaced.has(baseKeyOf(key)) ||
    replaced.has(safetyCopyOf(key)) ||
    (bookmarks !== null && key.startsWith(READING_BOOKMARK_PREFIX)) ||
    (kindOfKey(key) === 'setting' && (backup.kind === 'family' || key in settings));
  const going = keys.filter(goes);

  const others =
    (await storedSizeOf(keys.filter((key) => !goes(key)))) +
    sizeOfPairs(settingPairs) +
    sizeOfPairs(bookmarks || []) +
    (position ? pairSize(DATA_KEYS.readingPosition, position) : 0);
  const leftOut = fitRecords(records, data.articles, others);

  // Room first: what gives way goes before anything is written
  await writeOrPutBack(goes, async () => {
    await AsyncStorage.multiRemove(going);
    for (const [key, text] of Object.entries(records)) await writeText(key, text);
    if (position) await AsyncStorage.setItem(DATA_KEYS.readingPosition, position);
    if (bookmarks && bookmarks.length) await AsyncStorage.multiSet(bookmarks);
    if (settingPairs.length) await AsyncStorage.multiSet(settingPairs);
  });
  return { leftOut };
}

const union = (a = [], b = []) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])];

/**
 * Merge: adds what the phone doesn't have (feeds by URL, articles by id, saved
 * articles, notes and reading bookmarks). An article on both keeps the phone's
 * copy, marked read if either copy is. The phone keeps its own settings and
 * its reading position. Returns { leftOut }, the number of the oldest
 * articles, the phone's or the file's, that didn't fit.
 */
async function mergeWith(backup) {
  const file = backup.data;
  const keys = await allKeys();
  const phone = await readData(keys);

  const feedUrls = new Set(phone.feeds.map((feed) => feed && feed.url));
  const feeds = [...phone.feeds, ...(file.feeds || []).filter((feed) => feed && feed.url && !feedUrls.has(feed.url))];

  const fileArticles = new Map((file.articles || []).filter((a) => a && a.id).map((a) => [a.id, a]));
  const phoneIds = new Set(phone.articles.map((a) => a && a.id));
  const articles = [
    ...phone.articles.map((article) => {
      const other = article && fileArticles.get(article.id);
      return other && other.isRead && !article.isRead
        ? { ...article, isRead: true, readAt: other.readAt || article.readAt }
        : article;
    }),
    ...[...fileArticles.values()].filter((article) => !phoneIds.has(article.id)),
  ];

  const savedIds = new Set(phone.readLater.map((a) => a && a.id));
  const readLater = [...phone.readLater, ...(file.readLater || []).filter((a) => a && a.id && !savedIds.has(a.id))];

  // A note or a bookmark the phone has for the same article stays
  const notes = { ...(isObject(file.notes) ? file.notes : {}), ...phone.notes };
  const bookmarks = bookmarkPairsOf({ ...(isObject(file.readingBookmarks) ? file.readingBookmarks : {}), ...phone.readingBookmarks });

  const records = recordTextsOf({
    articles,
    feeds,
    readLater,
    notes,
    readArticleUrls: union(phone.readArticleUrls, file.readArticleUrls),
    removedArticles: union(phone.removedArticles, file.removedArticles),
  });
  // Every record is written again, so the safety copies of the old ones go;
  // the reading bookmarks are written again too
  const rewritten = new Set(Object.keys(records));
  const goes = (key) => rewritten.has(safetyCopyOf(key)) || key.startsWith(READING_BOOKMARK_PREFIX);
  const going = keys.filter(goes);
  const staying = keys.filter((key) => !rewritten.has(baseKeyOf(key)) && !goes(key));
  const leftOut = fitRecords(records, articles, (await storedSizeOf(staying)) + sizeOfPairs(bookmarks));

  await writeOrPutBack((key) => rewritten.has(baseKeyOf(key)) || goes(key), async () => {
    await AsyncStorage.multiRemove(going);
    // The articles first: when some are left out they may take less room
    // than the phone's did
    for (const [key, text] of Object.entries(records)) await writeText(key, text);
    if (bookmarks.length) await AsyncStorage.multiSet(bookmarks);
  });
  return { leftOut };
}

/**
 * Writes a checked backup ('replace' or 'merge'); the caller then reloads the
 * app's state. Returns { leftOut }: how many of the oldest articles didn't fit.
 * Throws BackupError('noRoom'), with nothing changed, when the saved articles
 * and notes alone don't fit.
 */
export async function applyRestore(backup, mode) {
  return mode === 'replace' ? replaceWith(backup) : mergeWith(backup);
}

/** Reads a backup file picked on the phone or in the browser, as bytes */
export async function readPickedFile(uriOrWebFile) {
  if (Platform.OS === 'web') return new Uint8Array(await uriOrWebFile.arrayBuffer());
  return new File(uriOrWebFile).bytes();
}

// ---- Clear All Data and Reset Settings

/** Deletes the records (feeds, articles, saved articles, notes, reading positions, read history); keeps the settings */
export async function clearAllData() {
  const keys = await allKeys();
  // Empty lists rather than missing keys, as a fresh start writes them
  await writeJson(DATA_KEYS.feeds, []);
  await writeJson(DATA_KEYS.articles, []);
  await writeJson(DATA_KEYS.readLater, []);
  await writeJson(DATA_KEYS.notes, {});
  await writeJson(DATA_KEYS.readArticleUrls, []);
  await writeJson(DATA_KEYS.removedArticles, []);
  await AsyncStorage.removeItem(DATA_KEYS.readingPosition);
  await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(READING_BOOKMARK_PREFIX)));
}

/**
 * Puts every setting back to its default: removes every key that is a setting.
 * The records, the downloaded translation models, the automatic backup and the
 * first-run flags (tour, What's New) stay.
 */
export async function resetSettings() {
  const keys = await allKeys();
  await removeKeys(keys.filter((key) => kindOfKey(key) === 'setting'));
}

// ---- The automatic backup (Android)

export const autoBackupAvailable = Platform.OS === 'android';

/** Whether FeedWell can still reach a picked folder: false once it's deleted or the access is gone */
const canReach = (uri) => {
  try {
    return new Directory(uri).exists;
  } catch (e) {
    return false;
  }
};

/** Its switch, folder ({ uri, name } or null for FeedWell's own storage), files and last run */
export async function getAutoBackupState() {
  const values = Object.fromEntries(await AsyncStorage.multiGet(Object.values(AUTO_BACKUP_KEYS)));
  const files = parseJson(values[AUTO_BACKUP_KEYS.files], []);
  const folder = parseJson(values[AUTO_BACKUP_KEYS.folder], null);
  return {
    enabled: values[AUTO_BACKUP_KEYS.enabled] === 'true',
    // A picked folder FeedWell can't reach counts as its own storage until one
    // is picked again, so the backups go on and the Data page says where they
    // go. The access ends with an uninstall, and Android's own backup can bring
    // the setting to a new phone without it.
    folder: folder && folder.uri && canReach(folder.uri) ? folder : null,
    files: Array.isArray(files) ? files : [],
    lastAt: values[AUTO_BACKUP_KEYS.lastAt] || null,
    lastHashes: parseJson(values[AUTO_BACKUP_KEYS.lastHashes], null),
  };
}

/** A picked folder's name as people know it: content://…/tree/primary%3ADownload%2FBackups/ gives Download/Backups */
export function folderNameOf(uri) {
  try {
    const tree = decodeURIComponent(uri.split('/tree/')[1] || '').replace(/\/+$/, '');
    const path = tree.includes(':') ? tree.slice(tree.indexOf(':') + 1) : tree;
    return path || tree || uri;
  } catch (e) {
    return uri;
  }
}

/** FeedWell's own storage: files/backups, left out of Android's Google backup */
function ownFolder() {
  const dir = new Directory(Paths.document, 'backups');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** A written file must read back and pass every check */
async function checkWritten(file) {
  await readBackup(await file.bytes());
}

/**
 * Writes the file so a crash never leaves half a file under a real name: in
 * FeedWell's own storage under a temporary name, renamed once checked. A
 * picked folder can't rename, so there it's written under the real name, read
 * back and checked, and deleted if the check fails.
 */
async function writeChecked(dir, picked, name, bytes) {
  if (!picked) {
    const temp = new File(dir, `${name}.tmp`);
    if (temp.exists) temp.delete();
    temp.create();
    temp.write(bytes);
    await checkWritten(temp);
    const target = new File(dir, name);
    if (target.exists) target.delete();
    temp.rename(name);
    return temp;
  }
  const file = dir.createFile(name, BACKUP_MIME);
  try {
    file.write(bytes);
    await checkWritten(file);
    return file;
  } catch (error) {
    try { file.delete(); } catch (e) { /* already gone */ }
    throw error;
  }
}

const deleteQuietly = (uri) => {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) { /* already gone, or the folder's access was withdrawn */ }
};

async function runAutomaticBackupNow(reason) {
  const state = await getAutoBackupState();
  if (!state.enabled) return null;
  if (reason === 'background' && state.lastAt && Date.now() - Date.parse(state.lastAt) < DAY_MS) return null;

  const snap = await snapshot();
  const unchanged =
    state.lastHashes &&
    state.lastHashes.settings === snap.hashes.settings &&
    state.lastHashes.data === snap.hashes.data;
  // In the background only when something changed; before Clear All Data and
  // Replace unless the last file already holds exactly this. Turning it on or
  // picking another folder always writes one.
  const forced = reason === 'turnedOn' || reason === 'folderChanged';
  if (!forced && unchanged && (reason === 'background' || state.files.some((f) => f.uri && new File(f.uri).exists))) {
    return null;
  }
  const backup = await zipSnapshot(snap, { automatic: true });

  const folderUri = state.folder && state.folder.uri ? state.folder.uri : null;
  const dir = folderUri ? new Directory(folderUri) : ownFolder();
  // A file of ours under the same name (made the same minute) gives way
  const same = state.files.find((f) => f.name === backup.name && (f.folder || null) === folderUri);
  if (same) deleteQuietly(same.uri);
  const written = await writeChecked(dir, !!folderUri, backup.name, backup.bytes);

  const files = [
    ...state.files.filter((f) => f !== same),
    { uri: written.uri, name: backup.name, folder: folderUri, createdAt: backup.manifest.createdAt, size: backup.bytes.length },
  ];
  // The last seven: only files on this list are ever deleted, and only now
  // that the new one passed its check
  while (files.length > AUTO_BACKUP_KEEP) deleteQuietly(files.shift().uri);

  await AsyncStorage.multiSet([
    [AUTO_BACKUP_KEYS.files, JSON.stringify(files)],
    [AUTO_BACKUP_KEYS.lastAt, new Date().toISOString()],
    [AUTO_BACKUP_KEYS.lastHashes, JSON.stringify(backup.hashes)],
  ]);
  return files[files.length - 1];
}

let running = null;

/**
 * Makes an automatic backup if it's on. `reason`: 'background' (at most once
 * a day, and only if something changed), 'turnedOn', 'folderChanged',
 * 'beforeClear' or 'beforeReplace'. Never throws: a backup that fails leaves
 * everything as it was.
 */
export function runAutomaticBackup(reason) {
  if (!autoBackupAvailable) return Promise.resolve(null);
  if (!running) {
    running = runAutomaticBackupNow(reason)
      .catch((error) => {
        console.warn('Automatic backup failed:', error?.message);
        return null;
      })
      .finally(() => {
        running = null;
      });
  }
  return running;
}

/**
 * Turns the automatic backup on: Android's folder picker once, then the first
 * backup. If the person cancels, the files go to FeedWell's own storage.
 */
export async function turnOnAutomaticBackup() {
  let folder = null;
  try {
    const dir = await Directory.pickDirectoryAsync();
    if (dir && dir.uri) folder = { uri: dir.uri, name: folderNameOf(dir.uri) };
  } catch (e) { /* cancelled: FeedWell's own storage */ }
  await AsyncStorage.multiSet([
    [AUTO_BACKUP_KEYS.enabled, 'true'],
    [AUTO_BACKUP_KEYS.folder, JSON.stringify(folder)],
  ]);
  return runAutomaticBackup('turnedOn');
}

/** Turning it off deletes nothing */
export async function turnOffAutomaticBackup() {
  await AsyncStorage.setItem(AUTO_BACKUP_KEYS.enabled, 'false');
}

/**
 * Where the picker opens to show a picked folder: Android's picker takes the
 * folder's document address (…/tree/<id>/document/<id>) and ignores the tree
 * address the picker gave back
 */
const pickerStartOf = (treeUri) => {
  const tree = treeUri.replace(/\/+$/, '');
  const id = tree.split('/tree/')[1];
  return id && !id.includes('/') ? `${tree}/document/${id}` : undefined;
};

/** Picks another folder, starting at the one in use; returns false if the person cancelled */
export async function changeBackupFolder() {
  const state = await getAutoBackupState();
  let dir;
  try {
    dir = await Directory.pickDirectoryAsync(state.folder && state.folder.uri ? pickerStartOf(state.folder.uri) : undefined);
  } catch (e) {
    return false;
  }
  if (!dir || !dir.uri) return false;
  await AsyncStorage.setItem(AUTO_BACKUP_KEYS.folder, JSON.stringify({ uri: dir.uri, name: folderNameOf(dir.uri) }));
  return true;
}

/** The automatic backups still there, newest first */
export async function listAutomaticBackups() {
  if (!autoBackupAvailable) return [];
  const { files } = await getAutoBackupState();
  return files
    .filter((f) => {
      try {
        return f.uri && new File(f.uri).exists;
      } catch (e) {
        return false;
      }
    })
    .reverse();
}

/** Reads one of the automatic backups, as bytes */
export async function readAutomaticBackup(entry) {
  return new File(entry.uri).bytes();
}

// ---- After a restore or a reset: the home-screen widget's own settings

/** Hands the widget the settings now in storage (it keeps its own copy) */
export async function applyWidgetSettings(widgetBridge) {
  if (Platform.OS !== 'android' || !widgetBridge) return;
  const [[, theme], [, opacity], [, showImages], [, slideSeconds], [, tallLayout]] = await AsyncStorage.multiGet([
    'widget_theme',
    'widget_opacity',
    'widget_show_images',
    'widget_slide_seconds',
    'widget_tall_layout',
  ]);
  try {
    widgetBridge.setWidgetTheme(theme || 'app');
    widgetBridge.setWidgetOpacity(Math.round((opacity ? parseInt(opacity, 10) : 100) * 2.55));
    if (widgetBridge.setWidgetShowImages) widgetBridge.setWidgetShowImages(showImages === null ? true : showImages === 'true');
    if (widgetBridge.setWidgetSlideSeconds) widgetBridge.setWidgetSlideSeconds(slideSeconds ? parseInt(slideSeconds, 10) : 10);
    if (widgetBridge.setWidgetTallLayout) widgetBridge.setWidgetTallLayout(tallLayout === 'article' ? 'article' : 'list');
  } catch (e) { /* the widget isn't there */ }
}
