<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# FeedWell - Cross-Platform RSS Reader

## Project Overview
FeedWell is a cross-platform RSS feed reader built with React Native and Expo. The app focuses on providing a clean, ad-free reading experience across Android, iOS, and Windows platforms.

## Key Features
- **Ad-blocking RSS parser**: Automatically removes ads, tracking scripts, and promotional content
- **Cross-platform compatibility**: Runs on Android, iOS, and Windows
- **Clean reading experience**: Focus on content with minimal distractions
- **Offline storage**: Uses AsyncStorage for persistent data
- **Modern UI**: Clean, intuitive interface with React Navigation

## Technical Stack
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: React Context API with useReducer
- **Storage**: AsyncStorage for feeds and articles
- **RSS Parsing**: react-native-rss-parser with custom ad-blocking
- **UI Components**: React Native Elements + custom components

## Architecture Patterns
- **Context Pattern**: For global state management (feeds, articles)
- **Custom Hooks**: For reusable logic (useFeed)
- **Utility Functions**: For RSS parsing and ad-blocking
- **Component-based**: Modular, reusable UI components

## Ad-Blocking Strategy
- Remove script tags and tracking elements
- Filter out ad domains (Google Ads, Amazon, Facebook, etc.)
- Remove elements with ad-related class names/IDs
- Clean HTML content while preserving article structure
- Block tracking in WebView with injected JavaScript

## Code Style Guidelines
- Use functional components with hooks
- Follow React Native best practices
- Use StyleSheet for consistent styling
- Implement proper error handling
- Add loading states for async operations
- Use TypeScript-style prop validation where possible

## Development Notes
- All feeds are stored locally for privacy
- No external analytics or tracking
- Supports both RSS and Atom feeds
- Graceful error handling for network issues
- Responsive design for different screen sizes

## Custom Instruction
- Everytime that you updating the app, please update the version number based on standard rules of version updating system.
