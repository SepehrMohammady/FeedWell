# Version Management System

FeedWell uses a centralized version management system to ensure consistency across all project files.

## Single Source of Truth

The **main version source** is located at:
```
src/config/version.js
```

This file contains the `APP_VERSION` object with all version-related information.

## Synchronized Files

The following files are automatically synchronized with the main version:
- `package.json` - NPM package version
- `app.json` - Expo configuration version
- `package-lock.json` - NPM lock file version

## Usage

### 1. Manual Version Update
To update to a new version (e.g., 0.8.0):
```bash
node scripts/update-version.js 0.8.0
```
This will update ALL files to the new version.

### 2. Sync Existing Version
To sync all files to the current version in `version.js`:
```bash
npm run sync-version
# or
node scripts/update-version.js
```

### 3. Update Version in Code
If you manually update `src/config/version.js`, run the sync command to update other files:
```bash
npm run sync-version
```

## Version Object Structure

```javascript
export const APP_VERSION = {
  version: '0.7.1',           // Main semantic version
  buildNumber: 71,            // Auto-calculated build number
  stage: 'Beta',              // Release stage
  fullVersion: '0.7.1 (Beta)', // Full display version
  storeVersion: '0.7.1',      // App store version
  buildInfo: { ... }          // Build metadata
};
```

## Benefits

✅ **Single source of truth** - Only one file to update manually
✅ **Automatic synchronization** - Script updates all dependent files
✅ **No version conflicts** - All files always have the same version
✅ **Easy maintenance** - Simple script commands
✅ **Build automation** - Can be integrated into CI/CD pipelines

## Best Practices

1. **Always use the script** - Don't manually edit version numbers in multiple files
2. **Update version.js first** - Then run sync command
3. **Commit all changes** - Version updates should include all affected files
4. **Use semantic versioning** - Follow major.minor.patch format
5. **Update before releases** - Ensure all files are synchronized before building

## Migration

If you find mismatched versions in the project:
1. Decide which version is correct
2. Update `src/config/version.js` to that version
3. Run `npm run sync-version`
4. Commit all changes

This ensures all files are aligned and future updates remain synchronized.