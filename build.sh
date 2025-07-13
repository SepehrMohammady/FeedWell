#!/bin/bash

# Build script for FeedWell
# This script helps build the app for different platforms

echo "🚀 Building FeedWell for multiple platforms..."

# Function to build for web
build_web() {
    echo "📱 Building for Web/Windows..."
    npx expo export --platform web
    echo "✅ Web build complete!"
}

# Function to build for Android
build_android() {
    echo "🤖 Building for Android..."
    npx expo build:android
    echo "✅ Android build complete!"
}

# Function to build for iOS
build_ios() {
    echo "🍎 Building for iOS..."
    npx expo build:ios
    echo "✅ iOS build complete!"
}

# Parse command line arguments
case "$1" in
    web)
        build_web
        ;;
    android)
        build_android
        ;;
    ios)
        build_ios
        ;;
    all)
        build_web
        build_android
        build_ios
        ;;
    *)
        echo "Usage: $0 {web|android|ios|all}"
        echo "Examples:"
        echo "  $0 web      # Build for web/Windows"
        echo "  $0 android  # Build for Android"
        echo "  $0 ios      # Build for iOS"
        echo "  $0 all      # Build for all platforms"
        exit 1
        ;;
esac

echo "🎉 Build process completed!"
