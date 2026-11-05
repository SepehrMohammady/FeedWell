// Every storage key FeedWell writes, sorted for the backup file (the ProjectWell
// family backup rules):
// - data: the records, written into data.json as JSON values;
// - kept on this phone: never in a backup, and Reset Settings leaves them alone;
// - every other key is a setting, written whole into settings.json as stored.
// A setting added later therefore comes along without being listed here; only
// a new kind of record or a new key that must stay on the phone needs a line.

// The records. Big values go through SafeStorage, which may split them into
// `<key>_chunks` and `<key>_chunk_<n>` keys.
export const DATA_KEYS = {
  feeds: 'feeds',
  articles: 'articles',
  readLater: 'feedwell_read_later_articles',
  notes: 'feedwell_article_notes',
  readArticleUrls: 'readArticleUrls',
  readingPosition: 'readingPosition',
  removedArticles: 'removedArticleUrls',
};

// One per article read in the reader: reading_bookmark_<article id>
export const READING_BOOKMARK_PREFIX = 'reading_bookmark_';

// The automatic backup's own state: its switch, its folder, the files it made,
// when it last ran and what it saved then
export const AUTO_BACKUP_KEYS = {
  enabled: 'autoBackup.enabled',
  folder: 'autoBackup.folder',
  files: 'autoBackup.files',
  lastAt: 'autoBackup.lastAt',
  lastHashes: 'autoBackup.lastHashes',
};

// The sale cards that have opened on this phone, and the day the last one did
// (services/sales.js)
export const SALE_CARDS_KEY = 'saleCards';

// Debug builds only: the day they pretend it is, to check the sale cards
export const DEBUG_TODAY_KEY = 'debug.today';

// Kept on this phone: navigation state, first-run flags, caches, the
// automatic backup's state and the sale cards seen
const KEPT_KEYS = new Set([
  'feedwell_nav_state',
  'hasSeenOnboarding',
  'lastSeenVersion',
  'ogImageAttemptCache',
  SALE_CARDS_KEY,
  DEBUG_TODAY_KEY,
  ...Object.values(AUTO_BACKUP_KEYS),
]);

// The safety copies the contexts keep while they save (articles_backup and so on)
const KEPT_SUFFIXES = ['_backup'];

const DATA_KEY_SET = new Set(Object.values(DATA_KEYS));

/** The key a SafeStorage chunk belongs to (`articles_chunk_2` belongs to `articles`) */
export const baseKeyOf = (key) => key.replace(/_chunks$/, '').replace(/_chunk_\d+$/, '');

/** 'data', 'kept' or 'setting' */
export function kindOfKey(key) {
  const base = baseKeyOf(key);
  if (DATA_KEY_SET.has(base) || base.startsWith(READING_BOOKMARK_PREFIX)) return 'data';
  if (KEPT_KEYS.has(base) || KEPT_SUFFIXES.some((suffix) => base.endsWith(suffix))) return 'kept';
  return 'setting';
}
