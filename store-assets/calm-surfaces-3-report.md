# FeedWell: Calm Surfaces 3 report

Branch `design/calm-surfaces-3`, made from `main` at 1.19.0 (`5a5d286`). One commit, not pushed,
not merged. Written against the spec including its 31 October changes. Settings stays one long
page in this pass, as the prompt asks; the family parts come next on their own branch.

Version unchanged (1.19.0, versionCode 143). No store build, and the screenshot tool wasn't run.

The phone (Doogee) has the restyled build installed, with FeedWell's setup as found: dark, Lavender
main color with the accent never picked (so it follows: Warm Beige), AMOLED off, English, Android
font size 1.0, the phone in night mode, the Feeds filter on All. One thing differs from before this
session: earlier, while testing, a pull-to-refresh on Home fetched new articles (68 became 87), and
the restyle was checked on that data.

## Files changed

New
- `src/theme/palette.js`: the five colors both pickers offer, the neutral base, every derived tone
  from spec section 3, the wash colors and the state colors, with the color math (`mix`,
  `contrast`, `ensureContrastOnAll`, `fillWithText`). Built once per combination.
- `src/theme/type.js`: Inter by weight (one family per weight), the type sizes, corners and the
  light-mode card shadow.
- `src/theme/ui.js`: the shared pieces, built once per theme and direction: cards and list cards
  with hairlines, section titles, chips, primary, secondary and danger buttons, icon circles,
  badges, sheets and dialogs, fields, the segmented control and the switch.
- `src/components/ScreenWash.js`: the wash, three radial-gradient views (spec method 1), one layer
  behind the whole app, mirrored in right to left.
- `src/utils/defaultFont.native.js`: Inter Regular for every Text and TextInput, WeatherWell's way
  (wrapping `require('react-native').Text` and `.TextInput`, skipping nested Text), imported first
  in `index.js`. `src/utils/defaultFont.js` is the web's no-op.
- `android/app/src/main/assets/fonts/Inter-{Regular,Medium,SemiBold,Bold}.ttf` (SHA-256 match the
  spec) and `assets/fonts/Inter-OFL.txt`.
- `store-assets/calm-surfaces-3-report.md`: this report.

Changed
- `android/app/build.gradle`: `noCompress` for the four fonts. No `expo prebuild` was run.
- `index.js`, `package.json`, `package-lock.json`: the default font first; `expo-navigation-bar`
  ~5.0.10.
- `App.js`: the wash behind everything; React Navigation's theme with a transparent background
  and Inter in its fonts; the status bar per mode; the navigation bar's buttons and
  `Appearance.setColorScheme` whenever the mode changes (as LedgerWell's `f25d7e6`).
- `src/context/ThemeContext.js`: colors from the palette; the accent (new key `accentIndex`,
  saved only when picked); `makeStyles`, which builds a screen's styles once per theme. The
  `paletteIndex` key stays the main color.
- `src/navigation/AppNavigator.js`: the framed tab bar in the bottom-tabs 7 version (clipped,
  no padding, the bar keyed by the theme), Inter tab labels that shrink a little rather than
  lose their end, transparent scenes.
- Screens: Home, Feeds (`FeedListScreen`), Saved (`ReadLaterScreen`), Article
  (`ArticleActionsScreen`), Reader (`ArticleReaderScreen`), Add Feed, Settings. Each builds its
  styles once per theme; the reader and Settings used to rebuild theirs on every render.
- Components: `AppTour`, `ArticleImage`, `CustomAlert`, `ErrorBoundary`, `MiniPlayer`,
  `ReadingPositionIndicator`, `SaveButton`, `WhatsNewModal`.
- `src/config/readingFonts.js`: Reading Font's System choice names the phone's font
  (`sans-serif` on Android), since leaving the family out now means Inter. The reader's own
  default for System (serif) is unchanged.
- All 30 dictionaries: the picker strings, shorter swatch names in 15 languages, the Testers
  title recased in 22 (below).

## Numbers

All on the Doogee over USB, release builds, dark mode, measured back to back in one session: the
1.19.0 build from `main`, then the restyle, installed over each other with the same data.

### Scrolling the Feeds list (87 articles with images)

From `measure-scroll.mjs`, GPU ms per frame, median of the last 120 frames, sorted into the
phone's clock groups:

| | Medium group | Slow group | On screen |
|---|---|---|---|
| Old 1.19.0 | 13.0, 13.8 | 25.6 | 59.8 fps, 0 vsyncs skipped |
| Restyle | 13.8, 14.3, 14.4, 14.8 | 27.7, 27.8 | 59.8 fps, 0 vsyncs skipped |

- Within the medium group the restyle costs about 0.9 ms more per frame at the median and 0.7 ms
  at the 90th percentile (15.2 to 15.7 ms against 16.0 to 16.3 ms), well under the spec's 3 ms.
- Every run of both builds held 59.8 fps with no skipped vsyncs.
- So the wash stays as radial-gradient views; the opaque image wasn't needed.

### Memory

TOTAL PSS after a cold start, Home, Feeds, one saved article in the reader and back to Feeds; one
fresh process per build.

| | TOTAL PSS |
|---|---|
| Old 1.19.0 | 238,270 KB |
| Restyle | 244,231 KB |

About 5.8 MB more, the size the spec expects, by category:
- Code +1.7 MB: Inter, read straight from the APK.
- Java heap +3.6 MB, native heap -3.3 MB, other private +4.0 MB, Graphics unchanged.
- One sample per build, so a few MB of the category moves can be timing.

### APK

169,015,908 to 170,717,677 bytes (+1.70 MB). The four Inter files are 1.67 MB of that, all listed
as Stored by `unzip -v`; the rest is code, strings and `expo-navigation-bar`.

### The wash against the target images

The default pair on Home, at 14 points down both side margins: every point within 1 level in 255
of `wash-light-1080x2340.png`, and likewise of `wash-dark-1080x2340.png`. Right to left mirrors
it: the main glow sits in the top right corner and the accent on the left edge.

### Contrast

A test that builds every theme (5 main colors, 6 accents counting "follows the main color", light,
dark and AMOLED: 90 themes) makes 3,439 checks of text, icons and outlines on what they sit on,
including every value of the spec's table for the default pair (`#766153` included). All pass.

## Checked on the phone

- Every screen in light and dark: Home, Feeds, Saved, Article, Reader, Add Feed, Settings and its
  sheets, the alerts, the tour, the mini player's sheets.
- AMOLED, Arabic and Android's largest font size (1.3) on the main screens and Settings. The font
  size is back at 1.0.
- The navigation bar (spec 4.4): with the phone dark and then light, the main window and an open
  sheet carry `LIGHT_NAVIGATION_BARS` exactly while the app is light.
- The tour: all 15 steps land on their targets, the reading position line included.
- Stack screens have no navigator header in FeedWell (each draws its own), and `uiautomator`
  lists all their buttons and titles.
- Reduce Motion and the tour's dimming behave as before; `KinetosisOverlay` is untouched.
- The reading position line sits where it did, between the rows of the list's card.

## What shows differently on screen

1. The color pickers. "Theme Color" (one row of unlabeled swatches, the palette's name as the
   row's description) becomes two rows: "Main Color" with the hint "Buttons, tabs and highlights",
   and "Accent Color" with "Titles, icons and text tints". Each has the five swatches with the
   color's name under it. The strings are LedgerWell's, in all 30 languages. Key
   `settings.themeColor` is gone; `settings.mainColor`, `mainColorHint`, `accentColor` and
   `accentColorHint` are new.
2. Shorter swatch names, from the spec's table, plus three FeedWell names that measured too wide
   in Inter (more than 68 dp at 11 sp), which take LedgerWell's words:
   - Arabic: Lavender خزامي
   - Czech: Béžová, Levandule
   - German: Beige, Himmel
   - Greek: Μπεζ
   - Finnish, French, Tagalog: Beige
   - Indonesian: Krem, Hijau, Langit
   - Japanese: ベージュ
   - Dutch: Hemel
   - Portuguese: Bege
   - Russian: Бежевый
   - Swahili: Beige, Anga, and Lavenda (was Zambarau Hafifu, 89 dp)
   - Ukrainian: Бежевий, Шавлія, Лаванда, Троянда
   - Vietnamese: Xô thơm and Oải hương (were Xanh xô thơm and Tím oải hương, 73 and 76 dp)
3. Settings' section titles are no longer uppercased by style (the only screen that did it), so
   `uiautomator` now reads "Preferences" rather than "PREFERENCES" for all ten. The Testers title
   was written in capitals in 22 languages' strings; it now has its neighbors' capitalization
   ("Testers", "Tester", "Тестеры" and so on).
4. Settings: the testers' thank-you is the card's title, the names are body text.
5. Article: "Read in App" and "Share" are secondary buttons instead of green and amber fills; red,
   green and amber now mean states only.
6. Alerts: Cancel is a secondary button (it was grey) and Remove or Delete is a red fill (it was a
   red tint). The icon sits in an accent circle, or a red one when the alert deletes something.
7. What's New: "Got it" is a secondary button (it was a text button).
8. Reader: the byline and image captions are no longer italic; the Translate button's "on" color
   is main ink instead of green.
9. The crash screen's Try Again button had no background (its color was the literal string
   `'theme.colors.primary'`); it is a primary button now.
10. At large font sizes the labels under the header icons (Feeds, Article, Reader) shrink a little
    to fit. At 1.3 the Feeds header used to push Add off the screen with Inter.
11. Right to left: the App Language row's chevron now points left like the others.

## For the store-screenshot config (`store-screenshots/apps/feedwell.mjs`)

The color row the config looks for (`^Theme Color, ` and taps at fixed x positions) is gone. The
new rows, as `uiautomator` reads them:
- TextViews "Main Color" and "Accent Color", each followed by its hint.
- Ten swatches, each a RadioButton whose content-desc is the color's name ("Warm Beige", "Sage",
  "Sky", "Lavender", "Rose" in English) and whose `selected` is true on the color in use. The
  same five names appear twice: the first match is the Main Color row, the second the Accent
  Color row.
- On the Doogee (English, font size 1.0, Settings scrolled to the top), the Main Color swatches'
  centers are at y 1726 and x 174, 357, 541, 724, 906; the Accent Color row sits 375 px lower.

Everything else the config uses reads as before: the tab labels (still matched by `, Settings$`
and so on), "Dark Mode", "AMOLED Black", "Reading Font", the saved cards ending in "OFFLINE",
`, More$`, "Highlight", "Notes", "Default Language", "Feed language", "Search articles...",
"Reduce Motion (Kinetosis)", "Got it" and "Skip".

## Couldn't match, or worth knowing

- A one-line description that fits its row to within about a pixel gets measured as two lines:
  React Native compares the text's width rounded up with the room rounded down, and draws it on
  one line. In English on the Doogee, Settings' first row (Auto Refresh) shows an empty line
  under its description. Other strings and screen widths aren't affected; I left it.
- The rows of the Feeds and Saved cards overlap by one pixel. FlatList places each row on the
  pixel grid apart from its height, which left a one-pixel gap under the first row where the
  page showed through as a faint line.
- The tab bar's order isn't mirrored in right to left, as before: FeedWell lays out right to left
  per component.
- On the web build the glows use CSS `backgroundImage`; I didn't run the web build.
- The home-screen widget is unchanged, as the spec says.

## Needs your decision

1. The screenshot config's light shots set only the main color (Sage). The accent now follows the
   main color, so those shots will show a Lavender accent. Keep that, or pick a Sage accent too?
2. The swatch-name changes above (15 languages): fine as they are?
3. Push the branch? It's committed locally only.
