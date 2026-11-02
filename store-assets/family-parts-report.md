# FeedWell: the family parts, report

Branch `family-parts`, made from `design/calm-surfaces-3`. Not pushed. The app's version is
unchanged (1.19.0, 143). Checked on the Doogee S98 Pro (Android 12), in a Node test harness
(28 tests) and in the web build in headless Edge.

## What changed

| Part | Where |
|---|---|
| Backup file, restore, Clear All Data, Reset Settings, automatic backup | `src/services/BackupService.js` (new) |
| Storage keys sorted into data, kept and settings | `src/config/backupKeys.js` (new) |
| Remount after a restore, reset or clear | `src/context/AppReloadContext.js` (new), `App.js` |
| Settings in categories, Data page, restore sheet | `src/screens/SettingsScreen.js` |
| Light, Dark and System | `src/context/ThemeContext.js`, framed `Segmented` in `src/theme/ui.js` |
| What's New from Settings | `src/context/TourContext.js`, `App.js`, `src/config/whatsNew.js` |
| Tour: Appearance and Backup & Restore steps | `src/config/tourSteps.js` |
| Crash screen in the app's language, mode and colors, with the version | `src/components/ErrorBoundary.js`, `src/context/LanguageContext.js` |
| More from SeMo Lab: TuneWell | `src/screens/SettingsScreen.js` |
| Android's own backup leaves FeedWell's backup folder out | `AndroidManifest.xml`, `res/xml/backup_rules.xml`, `res/xml/data_extraction_rules.xml` (new) |
| Inter in the web build | `src/theme/webFonts.js`, `src/theme/webFonts.web.js` (new), `App.js` |
| Strings | all 30 files in `src/i18n/locales/` |
| Libraries | `fflate` 0.8.3, `expo-crypto` ~15.0.9 |

## The backup file

`FeedWell_Backup_YYYY-MM-DD_HH-MM.feedwell`, local time, a ZIP holding `manifest.json`,
`settings.json` and `data.json`. Windows opens it as a ZIP, and the SHA-256 values in the
manifest match the files (checked with `tar` and `sha256sum`, not with FeedWell's own reader).

Before and after, for the same phone (4 feeds, 87 articles, 3 saved):

| | 1.19.0 file | New file |
|---|---|---|
| Size | 692 KB, JSON | 153 KB, ZIP (671 KB of JSON inside) |
| Holds | feeds, articles, saved articles, 14 settings, removed articles | everything below, every setting |
| Name | date in UTC, time in local time | local date and time |
| Left behind | a copy in the app's documents folder, for good | one share copy in the cache, replaced by the next |

### Storage keys

| Kind | Keys |
|---|---|
| Data, in `data.json` | `feeds`, `articles`, `feedwell_read_later_articles`, `feedwell_article_notes`, `readArticleUrls`, `readingPosition`, `removedArticleUrls`, and `reading_bookmark_<article id>` (gathered as `readingBookmarks`). A SafeStorage chunk (`<key>_chunks`, `<key>_chunk_<n>`) belongs to its key. |
| Kept on this phone | `feedwell_nav_state`, `hasSeenOnboarding`, `lastSeenVersion`, `ogImageAttemptCache`, every key ending in `_backup`, and the automatic backup's `autoBackup.enabled`, `autoBackup.folder`, `autoBackup.files`, `autoBackup.lastAt`, `autoBackup.lastHashes`. The downloaded translation models are not in storage and stay too. |
| Settings, in `settings.json` as stored | every other key. Today: `theme`, `paletteIndex`, `accentIndex`, `amoledBlack`, `appLanguage`, `allowRotation`, `articleFilter`, `autoRefresh`, `autoScrollDelay`, `autoScrollEnabled`, `autoScrollSpeed`, `autoTranslate`, `feedRegion`, `feedRegionUserSet`, `homeSections`, `keepAwakeEnabled`, `maxArticleAge`, `readLaterSortOrder`, `readerHeaderActions`, `readingFont`, `readingReminder`, `reduceMotion`, `showBookmarkIndicators`, `showImages`, `showReadingPositionInFeeds`, `skipArticleView`, `sortOrder`, `speechRate`, `translationTargetUserSet`, `ambient_*`, `feedwell_translation_target_language`, `feedwell_translation_mode`, `widget_theme`, `widget_opacity`, `widget_show_images`. |

`removedArticleUrls` is in `data.json` as `removedArticles`, so a restored phone keeps removed
articles out of the list, as 1.19.0's own backups do.

### Size and time on the test phone (release build)

| | 4 feeds, 87 articles | 20 feeds, 600 articles |
|---|---|---|
| JSON inside | 671 KB | 4.4 MB |
| File | 153 KB | 1.0 MB |
| Making it (Backup Data) | 1.5 s: 0.2 s reading and hashing, 1.3 s for the ZIP | 7.8 s: 0.8 s and 7.0 s |
| Reading and checking a file | 0.27 s | 1.8 s |
| Writing a restore | 0.35 to 0.5 s (Replace), 0.3 s (Merge) | 1.0 s |

- Making the ZIP is the slow part (fflate in Hermes). It now runs in 128 KB slices with a pause
  between them, so the app keeps answering touches and Read Aloud keeps going while an automatic
  backup runs (8% slower in total than one block).
- Reading a file got 3 to 5 times faster: Expo's `TextDecoder` is plain JavaScript and took 0.8 s
  for data.json. BackupService now decodes UTF-8 itself.
- The automatic backup compares hashes before it builds the ZIP, so a day with no change costs
  0.2 s, not 1.5 s.
- In the background Android slows the app about twofold (2.8 s to make the demo file).
- Seven copies: 1.1 MB for the demo phone, 7 MB at 600 articles. The copies in FeedWell's own
  storage are left out of Android's backup, so their total doesn't count against its 25 MB. No
  reason to keep fewer.
- 1.20.0 raises the storage limit from 6 to 20 MB. With it, on the phone: 1,000 articles (7.2 MB)
  restore and stay after a restart; 2,000 articles (14 MB, 20 feeds of 100) restore and stay too.
  That restore took about 23 s, counting the automatic backup FeedWell first makes of the 1,000
  articles it replaces. Making a backup of the 2,000 (3.4 MB) takes about 25 s, and its data is
  byte for byte the file they came from.

## Checks on the phone

All passed:

- Round trip: Backup Data, then Clear All Data, then Restore Data with Replace. Afterwards
  settings.json and data.json hash exactly as before the clear: feeds, articles with their read
  state, saved articles with a highlight, a note, a reading bookmark, the reading position, and
  every setting (Light, Lavender with Sage, Lora, English after switching to German, widget Dark
  without images at 55%).
- Merge onto a phone with another feed: 5 feeds, 107 articles, the note, bookmark and saved
  articles added, the phone's own settings and reading position kept.
- Old files: a file made by main's 1.19.0 on this phone (Replace) and the same file as 1.18.2
  writes it (Merge onto a phone with other feeds). Notes, bookmarks, the reading font, colors
  and widget stayed; the file's 14 settings applied, `isDarkMode` as Dark.
- Refused, and nothing changed (hashes before and after): a file cut short, one byte changed in
  data.json, a LedgerWell backup ("This is a LedgerWell backup, not a FeedWell one."), a newer
  schema ("comes from a newer version"), and a file that isn't a backup.
- Automatic backup: off on a fresh install and nothing written; at most once a day (tested by
  moving the saved time back a day with a debuggable build); nothing when nothing changed; the
  eighth file removed only the oldest of FeedWell's own, and a file of mine in the same folder
  stayed; names intact; access survives a restart; after uninstalling, the folder's files were
  still there and restored on the reinstalled app; off writes nothing and deletes nothing;
  cancelling the picker uses FeedWell's own storage and says so; Clear All Data and Replace each
  make one first, unless the last file already holds exactly that.
- Reset Settings: settings.json empty afterwards, data unchanged, automatic backup still on,
  colors back to Warm Beige and Lavender, mode System, language English.
- Clear All Data: settings unchanged (same hash), all data gone.
- System mode follows `cmd uimode night yes` and `no` while open, pages and open sheets included.
  Phone put back to night mode yes.
- Settings and its pages in light, dark, AMOLED, Arabic and font size 1.3 (with a relaunch, as
  the spec says). Font size put back to 1.0.
- Tour: 16 steps; Appearance (14) and Backup & Restore (15) land on their rows in dark, light
  and Arabic.
- What's New opens from its row.

Web (exported build in Edge): it starts; restoring a family file works; Backup Data downloads
`FeedWell_Backup_2026-11-02_01-05.feedwell`, a ZIP whose hashes match; Clear All Data keeps the settings; the
downloaded file and a 1.18.2 file both restore (Replace, and Merge onto other feeds); the crash
screen shows in English and Arabic, dark, with the version.

## Found and fixed along the way

- Restoring more than FeedWell can store reported "Restore Complete" with the file's feeds and
  the phone's old articles. A failed write now stops the restore with an error and reloads the
  app; articles are written first, so when they don't fit the phone is unchanged.
- An automatic backup whose folder can't be reached (deleted, or the access lost after an
  uninstall, when Android's own backup brings the setting back to a new phone) failed silently
  every time. It now goes to FeedWell's own storage, the Data page says so, and the folder is
  used again once it's back.
- Backup Folder ignored the folder in use and opened wherever the picker was last. It now opens
  at the current folder.
- The Data page showed what was true when Settings first opened; it now reads again when it
  opens and when FeedWell comes back.
- Dates had no time ("11/1/2026" seven times in the restore list) and were in US order in every
  language. They now show date and time in the app's language, with Latin digits as elsewhere
  (Persian in Farsi).
- "1 notes", "1 feeds": the counts in the Clear All Data warning and the restore preview now read
  "your feeds (4)" and "Feeds: 4" in the 14 languages where the number changes the word.
- The web build showed every text in a serif font: Inter was only in the Android app (since the
  restyle). The web build now loads it.
- In 1.20.0: articles over 2 MB in Farsi (or any script that takes more than one byte a
  character) saved but couldn't be read back. SafeStorage cut its chunks by characters, and
  Android reads each one through a 2 MB window counted in bytes. On the phone, 320 Farsi articles
  (3.1 MB) restored with "Restore Complete", and after a restart Home showed 0 unread; an
  automatic backup made then held no articles. Chunks now hold a third as many characters, so
  they fit whatever the script, and never end between the two halves of an emoji. With 1.20.0
  the same file shows 274 unread before and after a restart. Data an older version already
  saved that way stays unreadable until FeedWell saves its articles again.

## Strings

Copied from the sibling apps, all 30 languages:

| Key | From |
|---|---|
| `settings.appearance`, `settings.modeSystem`, `settings.modeLight`, `settings.modeDark`, `settings.resetTitle`, `settings.resetConfirm`, `settings.resetDone` | WeatherWell |
| `backup.autoBackup`, `backup.lastBackup` | MatchWell |
| `settings.whatsNew`, `settings.whatsNewDesc`, `backup.replace`, `backup.merge`, `tour.backupTitle` | LedgerWell (`whatsNew`, `whatsNewDescription`, `replaceData`, `mergeData`, `tourBackupTitle`) |
| `settings.appTuneWellDesc` | TuneWell's Play short description, shortened (17 languages); my own for the other 13 |

Written for FeedWell in all 30 languages: `settings.sectionReading`, `settings.resetSettingsDesc`,
`settings.clearAllDataDesc` and `settings.clearAllDataConfirm` (both reworded), `backup.autoBackupDesc`,
`backup.noBackupYet`, `backup.folder`, `backup.folderAppStorage`, `backup.automaticBackups`,
`backup.chooseFile`, `backup.previewMessage`, `backup.otherAppMessage`, `backup.newerMessage`,
`backup.damagedMessage`, `backup.restoreDone`, `tour.appearanceBody`, `tour.backupBody`,
`crash.title`, `crash.message`, and the What's New entries (`whatsNew.newLookTitle`/`Body`,
`systemModeTitle`/`Body`, `settingsTitle`/`Body`, `backupTitle`/`Body`, `autoBackupBody`,
`resetBody`).

Removed (no longer used): `tour.settingsTitle`, `tour.settingsBody`, `settings.darkMode`,
`settings.darkModeDesc`, `settings.restoreSelectFileMessage`, `settings.restoreConfirmMessage`,
`settings.restoreAction`, `settings.restoreCompleteMessage`, `settings.restoreCompleteWebMessage`,
`settings.backupSavedTo`, `whatsNew.backFixTitle`, `whatsNew.backFixBody`.

## For the store-screenshot config (`store-screenshots/apps/feedwell.mjs`)

The config scrolls one long Settings page. Now:

- Settings opens on a list of categories: Appearance, Feeds, Reading, Translation, Home Screen
  Widget, Data, App Tour, What's New, About. A row reads as ", Appearance, System · Warm Beige ·
  Lavender · English,"; tap it by its title. Each page has a round back button labelled "Back"
  (top left, top right in Arabic); Android's back also returns to the list.
- The Settings tab keeps its open page when you switch tabs, so start with "Back" if a page may
  be open.
- Dark Mode switch: gone. Appearance has three segments, "System", "Light", "Dark"; tap the text.
- AMOLED Black: on the Appearance page, same label, shown only when the mode isn't Light.
- Theme Color: gone. Appearance has Main Color and Accent Color, each a row of five radio buttons
  whose content-desc is the color name ("Warm Beige", "Sage", "Sky", "Lavender", "Rose"). The
  first five are Main, the next five Accent: same names, so pick by order or by position below
  "Accent Color". The SWATCH x positions are no longer needed.
- Reading Font: Settings, Reading, "Reading Font".
- Reduce Motion (Kinetosis): Settings, Reading.
- Default Language: Settings, Translation, "Default Language".
- Bookmark Indicators: moved from Feeds to Reading (see decisions).
- Backup Data, Restore Data, Reset Settings, Clear All Data: Settings, Data.
- First run after `pm clear`: What's New ("Got it", "Take the tour") as before; the tour has 16
  steps.

## Decisions

1. What's New version: the release is 1.20.0 (144).
2. FeedWell's storage limit: raised from 6 to 20 MB (`AsyncStorage_db_size_in_MB` in
   `android/gradle.properties`), about 2,700 full-text articles. 20 rather than more because app
   data over 25 MB stops Android's own backup of FeedWell.
3. Bookmark Indicators stays under Reading.
4. The status bar icons over a sheet that's open while the phone switches light/dark keep the
   old color until it closes (Android gives a sheet its own window). Left as it is.
5. A restore that doesn't fit shows the existing "Failed to restore backup. Please check the
   file and try again." Not changed; a message that names the cause needs a new string in 30
   languages.
6. Both branches are merged into main and pushed with 1.20.0.

Also seen, not changed: on the web, the existing portrait lock logs an error in desktop browsers
(`screen.orientation.lock()`), as it does on main.

## The test phone

FeedWell's setup is back: 4 feeds, 87 articles (3 read), 3 saved with the highlight, dark,
Lavender, accent never picked, English, AMOLED off, filter All, font size 1.0, night mode yes,
automatic backup off, only the built-in English translation model. My test folders in Download
are deleted. Two leftovers I couldn't remove (a safety check stopped the command): the automatic
backup's keys stay in FeedWell's storage in their "off" state (harmless; turning it on asks for a
folder again), and older Backup Data copies in FeedWell's cache, which the final build removes
the next time Backup Data runs (it ran once after I installed it) or Android clears with the
cache. ThinkWell was not touched.

Nov 2, for 1.20.0: the setup was found with its theme following the phone, not Dark, which my
tests had left. It is restored again from the same copy, Dark included, with 1.20.0 installed and
automatic backup off. FeedWell's own refresh then added two new NASA articles (89, 86 unread);
the other 87 are unchanged. The test folders are deleted again.
