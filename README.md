# FeedWell - Cross-Platform RSS Reader

FeedWell is a modern, ad-free RSS feed reader built with React Native and Expo. It provides a clean reading experience across Android, iOS, and Windows platforms, automatically blocking ads and tracking scripts.

## Features

🚫 **Ad-Free Reading** - Automatically removes ads, tracking scripts, and promotional content
📱 **Cross-Platform** - Runs on Android, iOS, and Windows (via web)
🎨 **Clean Interface** - Modern, intuitive design focused on content
💾 **Offline Storage** - Feeds and articles stored locally for privacy
🔄 **Auto-Refresh** - Keep your feeds updated automatically
🖼️ **Media Support** - Images and media preserved in articles
🌐 **WebView Reader** - Optional web view with ad-blocking for original articles

## Technology Stack

- **React Native** with Expo for cross-platform development
- **React Navigation** for seamless navigation
- **AsyncStorage** for local data persistence
- **Custom RSS Parser** with advanced ad-blocking
- **WebView** with JavaScript injection for ad-free browsing

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- For mobile development: Android Studio or Xcode

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
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

## Building for Production

### Android
```bash
expo build:android
```

### iOS
```bash
expo build:ios
```

### Web
```bash
expo build:web
```

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
