@echo off
REM Build script for FeedWell on Windows
REM This script helps build the app for different platforms

echo 🚀 Building FeedWell for multiple platforms...

if "%1"=="web" goto build_web
if "%1"=="android" goto build_android
if "%1"=="ios" goto build_ios
if "%1"=="all" goto build_all
goto usage

:build_web
echo 📱 Building for Web/Windows...
npx expo export --platform web
echo ✅ Web build complete!
goto end

:build_android
echo 🤖 Building for Android...
npx expo build:android
echo ✅ Android build complete!
goto end

:build_ios
echo 🍎 Building for iOS...
npx expo build:ios
echo ✅ iOS build complete!
goto end

:build_all
call :build_web
call :build_android
call :build_ios
goto end

:usage
echo Usage: %0 {web^|android^|ios^|all}
echo Examples:
echo   %0 web      # Build for web/Windows
echo   %0 android  # Build for Android
echo   %0 ios      # Build for iOS
echo   %0 all      # Build for all platforms
exit /b 1

:end
echo 🎉 Build process completed!
