# FeedWell - Cross-Platform RSS Reader

FeedWell is a modern, ad-free RSS feed reader built with React Native and Expo. It provides a clean reading experience across Android, iOS, and Windows platforms, automatically blocking ads and tracking scripts.

## ✨ Key Features

### 🚫 **Ad-Free Reading Experience**
- Automatically removes ads, tracking scripts, and promotional content
- Clean, distraction-free article rendering
- Custom ad-blocking algorithm for RSS feeds
- WebView with JavaScript injection for ad-free web browsing

### 📱 **Cross-Platform Support**
- **Android**: Native Android app via Expo
- **iOS**: Native iOS app (requires macOS for building)
- **Windows**: Web-based application
- Consistent experience across all platforms

### 🎯 **Reading Features**
- **Reading Position Bookmarks**: Visual markers to track your progress between articles
- **Auto-scroll**: Automatically scrolls to your last reading position
- **Multiple View Modes**: Clean text view or original web view
- **Offline Reading**: Articles cached locally for offline access
- **Media Support**: Images and media preserved in articles

### 🔄 **Feed Management**
- **Auto-Refresh**: Keeps your feeds updated automatically
- **Popular Feeds**: Quick access to BBC, TechCrunch, Reuters, The Verge, and more
- **Custom Feeds**: Add any RSS or Atom feed URL
- **Feed Organization**: Easy feed management and removal

### 🛡️ **Privacy & Security**
- **No Data Collection**: All data stays on your device
- **No Tracking**: No analytics or user tracking
- **Local Storage**: Feeds and articles stored locally using AsyncStorage
- **No External Dependencies**: No third-party services required

### 🎨 **User Experience**
- **Modern Design**: Clean, intuitive interface focused on content
- **Navigation**: Smooth navigation with React Navigation
- **Fast Performance**: Optimized parsing and rendering
- **Error Handling**: Comprehensive error handling and recovery

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or later)
- Expo CLI: `npm install -g @expo/cli`

### Installation
```bash
git clone https://github.com/SepehrMohammady/FeedWell.git
cd FeedWell
npm install
npm start
```

### Running on Different Platforms
- **Android**: `npm run android`
- **iOS**: `npm run ios` (requires macOS)
- **Web/Windows**: `npm run web`

## 📱 Building for Production

### Android APK
```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

### iOS
```bash
eas build --platform ios --profile preview
```

## 🏗️ Technical Architecture

### Technology Stack
- **React Native** with Expo for cross-platform development
- **React Navigation** for seamless navigation
- **AsyncStorage** for local data persistence
- **Custom RSS Parser** with advanced ad-blocking
- **Context API** for state management

### Project Structure
```
src/
├── components/     # Reusable UI components
├── context/        # React Context for state management
├── navigation/     # Navigation configuration
├── screens/        # Main app screens
├── utils/          # RSS parsing and ad-blocking utilities
└── config/         # App configuration and version management
```

## 🛠️ Development

### Version Management
Update app version across all files:
```bash
npm run update-version 1.0.0
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across platforms
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**FeedWell** - Reading the web, minus the clutter. 🚀
