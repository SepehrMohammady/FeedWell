# FeedWell - Cross-Platform RSS Reader

FeedWell is a modern, ad-free RSS feed reader built with React Native and Expo. It provides a clean reading experience across Android, iOS, and Windows platforms, automatically blocking ads and tracking scripts.

## ✨ Features

🚫 **Ad-Free Reading** - Automatically removes ads, tracking scripts, and promotional content  
📱 **Cross-Platform** - Runs on Android, iOS, and Windows (via web)  
🎨 **Clean Interface** - Modern, intuitive design focused on content  
💾 **Offline Storage** - Feeds and articles stored locally for privacy  
🔄 **Auto-Refresh** - Keep your feeds updated automatically  
🖼️ **Media Support** - Images and media preserved in articles  
🌐 **WebView Reader** - Optional web view with ad-blocking for original articles  
⚡ **Fast & Reliable** - Optimized performance with comprehensive error handling  
🛡️ **Privacy First** - No tracking, no data collection, completely local storage

## Technology Stack

- **React Native** with Expo for cross-platform development
- **React Navigation** for seamless navigation
- **AsyncStorage** for local data persistence
- **Custom RSS Parser** with advanced ad-blocking
- **WebView** with JavaScript injection for ad-free browsing

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn  
- Expo CLI (`npm install -g @expo/cli`)
- For mobile development: Android Studio or Xcode

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SepehrMohammady/FeedWell.git
   cd FeedWell
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

### Running on Different Platforms

- **Android**: `npm run android`
- **iOS**: `npm run ios` (requires macOS)
- **Web/Windows**: `npm run web`

## Usage

### Adding Feeds

1. Tap the "+" button in the header
2. Enter an RSS or Atom feed URL
3. Tap "Add Feed" to start following

### Popular Feeds Included

The app includes quick access to popular feeds like:
- BBC News
- TechCrunch
- Reuters
- The Verge
- Ars Technica
- Hacker News

### Reading Articles

- **Clean Text View**: Ad-free, formatted text with images
- **Web View**: Original article with ads blocked
- **Share**: Share articles with others
- **External Browser**: Open in your default browser

## Privacy & Security

- **No Data Collection**: All data stays on your device
- **No Tracking**: No analytics or user tracking
- **Ad Blocking**: Comprehensive ad and tracker removal
- **Local Storage**: Feeds and articles stored locally only

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React Context for state management
├── navigation/         # Navigation configuration
├── screens/           # Main app screens
├── utils/             # Utility functions (RSS parsing, ad blocking)
└── App.js             # Main app component
```

## 📱 Building for Production

### Using EAS Build (Recommended)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Build for Android**
   ```bash
   eas build --platform android --profile preview
   ```

3. **Build for iOS**
   ```bash
   eas build --platform ios --profile preview
   ```

4. **Build for both platforms**
   ```bash
   eas build --platform all --profile preview
   ```

### Legacy Build Commands (Deprecated)
```bash
# These are no longer recommended
expo build:android
expo build:ios
```

### Web
```bash
expo build:web
```

## 🔄 Recent Updates (v0.6.3)

### ✨ New Features
- **Reading Position Bookmarks** - Visual markers to track your reading progress between articles
- **Auto-scroll functionality** - Automatically scrolls to your last reading position when opening Feeds tab
- **Centralized version management** - Consistent versioning across all app files and configurations

### ✅ Bug Fixes & Improvements
- **Fixed navigation bug** - Adding feeds now properly navigates to Feeds tab without requiring app restart
- **Improved reading experience** - Narrow bullet design for reading position indicators
- **Enhanced stability** - Fixed crashes related to undefined array access in auto-scroll functionality
- **Better UX flow** - Smooth navigation transitions after feed operations

### 🛠️ Development Improvements
- **Version Management System** - Automated script for updating versions across all files
- **Enhanced build process** - Proper versionCode setup for Android APK builds
- **Better documentation** - Comprehensive version management guide in `/docs/`

### 🧹 Code Quality
- **Project cleanup** - Removed unused debug files and outdated build scripts
- **Enhanced error handling** - Better error messages and recovery mechanisms
- **Improved performance** - Optimized feed parsing and storage operations

## 📋 Version Management

This project uses a centralized version management system. To update the version:

```bash
# Update to a new version (automatically updates all files)
npm run update-version 0.7.0
```

For detailed information, see [Version Management Guide](docs/VERSION_MANAGEMENT.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across platforms
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, feature requests, or questions, please open an issue on GitHub.

---

**FeedWell** - Reading the web, minus the clutter.
