<p align="center">
  <img src="assets/icon.png" alt="FeedWell Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<h1 align="center">FeedWell</h1>

<p align="center">
  <strong>Ad-free RSS feed reader for Android, iOS & Windows</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Windows-green?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-orange?style=flat-square" alt="License" />
</p>

<p align="center">
  <em>Read the web, minus the clutter.</em>
</p>

---

## 💡 What is FeedWell?

FeedWell is a **clean, private RSS reader** that blocks ads, removes trackers, and lets you focus on what matters — the content. Subscribe to any RSS or Atom feed and enjoy distraction-free reading.

No accounts. No tracking. No ads. Everything stays on your device.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📰 Smart Feed Reader
- Subscribe to any RSS / Atom feed
- One-tap access to popular feeds (BBC, TechCrunch, Reuters, The Verge, and more)
- Auto-refresh keeps articles up to date
- Search articles across all feeds
- Filter by read / unread status

</td>
<td width="50%">

### 🚫 Built-in Ad Blocker
- Strips ads, tracking scripts & promotional content from feeds
- Removes tracking pixels and analytics
- Blocks ad domains (Google Ads, Facebook, Taboola, etc.)
- Clean HTML rendering preserves article structure

</td>
</tr>
<tr>
<td width="50%">

### 📖 Beautiful Reader
- In-app article reader with clean typography
- **Translate articles** — Google Translate (online) + ML Kit (offline)
- RTL language support (Farsi, Arabic, Hebrew)
- Selectable text for copying
- Open in browser or read in-app

</td>
<td width="50%">

### 🔖 Save for Later
- Bookmark articles to read later
- Search & sort saved articles
- Sort by newest or oldest
- Share articles with preview images

</td>
</tr>
<tr>
<td width="50%">

### 🎨 Personalized Experience
- Dark mode & light mode
- Adjustable font size
- Toggle article images on/off
- Choose your theme accent color
- Responsive layout for any screen size

</td>
<td width="50%">

### 🛡️ Privacy First
- **Zero data collection** — all data stays on your device
- **No analytics** — no tracking whatsoever
- **Local storage** — feeds & articles stored securely
- **Backup & restore** — export/import your data anytime
- **Open source** — inspect every line of code

</td>
</tr>
</table>

---

## 📱 Supported Platforms

| Platform | Status |
|----------|--------|
| 🤖 Android | ✅ Full support |
| 🍎 iOS | ✅ Full support |
| 🪟 Windows | ✅ Web-based |

---

## 📥 Installation

### Android
Download the latest APK from [Releases](https://github.com/SepehrMohammady/FeedWell/releases) and install it directly on your device.

### Build from Source
```bash
git clone https://github.com/SepehrMohammady/FeedWell.git
cd FeedWell
npm install
```

**Android APK:**
```bash
cd android
.\gradlew assembleRelease
# APK → android/app/build/outputs/apk/release/app-release.apk
```

**Development server:**
```bash
npm start
```

---

## 🗂️ Project Structure

```
FeedWell/
├── src/
│   ├── components/     # Reusable UI components
│   ├── config/         # Version & app configuration
│   ├── context/        # State management (feeds, themes, settings)
│   ├── navigation/     # Tab & stack navigation
│   ├── screens/        # App screens (Home, Feeds, Reader, Settings)
│   └── utils/          # RSS parser, ad blocker, language detection
├── assets/             # App icons & splash images
├── scripts/            # Version management tools
└── android/            # Native Android build files
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 54 |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| State | React Context API + useReducer |
| Storage | AsyncStorage with SafeStorage wrapper |
| RSS Parsing | react-native-rss-parser + custom ad-blocking |
| Translation | Google Translate API + ML Kit on-device |
| Build | Gradle (Android) / Expo (iOS & Web) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>FeedWell</strong> — Your feeds. Your way. No ads. No tracking.<br/>
  Made with ❤️ by <a href="https://github.com/SepehrMohammady">Sepehr Mohammady</a>
</p>
