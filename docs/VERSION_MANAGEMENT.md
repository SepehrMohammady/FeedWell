# Version Management

This document explains how version management works in FeedWell to ensure consistency across all files.

## Current Version System

The app uses a centralized version management system with the following files:

### 📁 Source of Truth
- **`src/config/version.js`** - Main version configuration file that exports `APP_VERSION`

### 📁 Auto-Updated Files
- **`package.json`** - Node.js package version
- **`app.json`** - Expo configuration (version + versionCode for Android)
- **`package-lock.json`** - Lock file version sync
- **UI Components** - Settings screen and home screen display versions

## How to Update Version

### Method 1: Use the Update Script (Recommended)
```bash
# Update to a new version (e.g., 0.7.0)
npm run update-version 0.7.0

# Or run the script directly
node scripts/update-version.js 0.7.0
```

This will automatically update:
- ✅ `src/config/version.js` - Main version config
- ✅ `package.json` - Package version
- ✅ `app.json` - Expo version + Android versionCode
- ✅ `package-lock.json` - Lock file sync

### Method 2: Manual Update
If you prefer manual updates, only edit `src/config/version.js`:

```javascript
export const APP_VERSION = {
  version: '0.7.0',        // Update this
  buildNumber: 70,         // Update this (major.minor*10 + patch)
  stage: 'Beta',           // Update if needed
  // ... rest stays the same
};
```

Then run the update script to sync other files:
```bash
npm run update-version 0.7.0
```

## Version Schema

### Semantic Versioning (major.minor.patch)
- **Major (0.x.x)**: Breaking changes, major features
- **Minor (x.6.x)**: New features, enhancements
- **Patch (x.x.3)**: Bug fixes, small improvements

### Build Number Calculation
Build number = `(minor * 10) + patch`
- Version `0.6.3` → Build `63`
- Version `0.7.0` → Build `70`
- Version `1.2.5` → Build `125`

### Release Stages
- **Alpha**: Early development, unstable
- **Beta**: Feature-complete, testing phase  
- **RC**: Release Candidate, pre-release
- **Stable**: Production ready

## Files That Use Version

### React Components
```javascript
import { APP_VERSION } from '../config/version';

// Display full version
<Text>Version {APP_VERSION.fullVersion}</Text>
// Output: "Version 0.6.3 (Beta)"

// Access individual parts
console.log(APP_VERSION.version);      // "0.6.3"
console.log(APP_VERSION.buildNumber);  // 63
console.log(APP_VERSION.stage);        // "Beta"
```

### Build Configurations
- **Android APK**: Uses `versionCode` from `app.json`
- **iOS IPA**: Uses `version` from `app.json`
- **Expo Updates**: Tracks version for over-the-air updates

## Best Practices

### ✅ Do:
- Always use the update script for version changes
- Follow semantic versioning rules
- Update version before creating builds
- Commit version changes together with related features

### ❌ Don't:
- Manually edit multiple version files
- Skip version updates for releases
- Use non-semantic version numbers
- Change version in the middle of development

## Troubleshooting

### Version Mismatch Errors
If you encounter version mismatches during builds:

1. Check current versions:
   ```bash
   grep -r "version.*:" . --include="*.json" --include="*.js"
   ```

2. Run the update script to fix:
   ```bash
   npm run update-version [current-version]
   ```

3. Verify all files are updated and commit changes

### Build Failures
- Ensure `versionCode` in `app.json` is incremented for Android
- Check that version strings don't contain spaces or special characters
- Verify semantic versioning format (x.y.z)

## Future Improvements

- [ ] Automatic version bumping with git hooks
- [ ] Integration with CI/CD for automated releases
- [ ] Version changelog generation
- [ ] Automatic build number calculation from git commits
