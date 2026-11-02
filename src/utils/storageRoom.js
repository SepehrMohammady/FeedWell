import { Platform } from 'react-native';

const MB = 1024 * 1024;
const WEB = Platform.OS === 'web';

// How much FeedWell's storage holds. On Android it's AsyncStorage_db_size_in_MB
// in android/gradle.properties: keep the two the same. In a browser it's
// localStorage, 5 MB in the strictest one (Safari), where a character up to
// U+00FF takes a byte and any other two.
export const STORAGE_LIMIT = WEB ? 5 * MB : 20 * MB;

// Room that stays free when FeedWell fills its storage: the database's own
// pages, and the settings, reading bookmarks and caches the app writes as it runs
export const STORAGE_HEADROOM = WEB ? 0.4 * MB : 1.5 * MB;

/**
 * The room a stored text takes: its UTF-8 bytes on the phone (SQLite), and in
 * a browser a byte a character up to U+00FF and two above. A long text is
 * measured on every eighth character, close enough and eight times faster.
 */
export function storedSize(text) {
  if (typeof text !== 'string') return 0;
  const length = text.length;
  const step = length > 4096 ? 8 : 1;
  let extra = 0;
  for (let i = 0; i < length; i += step) {
    const c = text.charCodeAt(i);
    if (WEB) {
      if (c > 0xff) extra += 1;
    } else if (c >= 0x80) {
      // Two bytes up to U+07FF, three above; each half of an emoji's pair
      // counts one more, four bytes for the two
      extra += c >= 0x800 && (c < 0xd800 || c > 0xdfff) ? 2 : 1;
    }
  }
  return length + extra * step;
}
