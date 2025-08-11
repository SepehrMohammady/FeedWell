#!/usr/bin/env node

/**
 * Version Update Script for FeedWell
 * 
 * This script updates version numbers across all files in the project
 * Usage: node scripts/update-version.js [new-version]
 * Example: node scripts/update-version.js 0.7.0
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateVersion(version) {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
}

function generateBuildNumber(version) {
  // Convert version like "0.6.3" to build number like 63
  const parts = version.split('.');
  return parseInt(parts[1]) * 10 + parseInt(parts[2]);
}

function updateVersionConfig(newVersion) {
  const configPath = path.join(__dirname, '..', 'src', 'config', 'version.js');
  const buildNumber = generateBuildNumber(newVersion);
  
  const content = `/**
 * Centralized version management for FeedWell
 * Update this file to maintain version consistency across the entire app
 */

export const APP_VERSION = {
  // Main version number (semantic versioning: major.minor.patch)
  version: '${newVersion}',
  
  // Build/version code for app stores (increment for each release)
  buildNumber: ${buildNumber},
  
  // Release stage
  stage: 'Beta', // 'Alpha', 'Beta', 'RC', 'Stable'
  
  // Full version string for display
  get fullVersion() {
    return \`\${this.version} (\${this.stage})\`;
  },
  
  // Version for app stores (combines version and build)
  get storeVersion() {
    return this.version;
  },
  
  // Build info for debugging
  get buildInfo() {
    return {
      version: this.version,
      buildNumber: this.buildNumber,
      stage: this.stage,
      buildDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };
  }
};

export default APP_VERSION;`;

  fs.writeFileSync(configPath, content);
  log(`✅ Updated version config: ${newVersion}`, 'green');
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  log(`✅ Updated package.json: ${newVersion}`, 'green');
}

function updateAppJson(newVersion) {
  const appPath = path.join(__dirname, '..', 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  const buildNumber = generateBuildNumber(newVersion);
  
  appJson.expo.version = newVersion;
  appJson.expo.android.versionCode = buildNumber;
  
  fs.writeFileSync(appPath, JSON.stringify(appJson, null, 2) + '\n');
  log(`✅ Updated app.json: ${newVersion} (build ${buildNumber})`, 'green');
}

function updatePackageLock(newVersion) {
  const lockPath = path.join(__dirname, '..', 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lockJson.version = newVersion;
    if (lockJson.packages && lockJson.packages[""]) {
      lockJson.packages[""].version = newVersion;
    }
    fs.writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n');
    log(`✅ Updated package-lock.json: ${newVersion}`, 'green');
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('❌ Please provide a version number', 'red');
    log('Usage: node scripts/update-version.js [version]', 'yellow');
    log('Example: node scripts/update-version.js 0.7.0', 'yellow');
    process.exit(1);
  }
  
  const newVersion = args[0];
  
  if (!validateVersion(newVersion)) {
    log('❌ Invalid version format. Use semantic versioning (e.g., 0.7.0)', 'red');
    process.exit(1);
  }
  
  log(`🚀 Updating FeedWell to version ${newVersion}...`, 'cyan');
  
  try {
    updateVersionConfig(newVersion);
    updatePackageJson(newVersion);
    updateAppJson(newVersion);
    updatePackageLock(newVersion);
    
    log(`\n🎉 Successfully updated all files to version ${newVersion}!`, 'green');
    log('📋 Updated files:', 'blue');
    log('  - src/config/version.js', 'blue');
    log('  - package.json', 'blue');
    log('  - app.json', 'blue');
    log('  - package-lock.json', 'blue');
    log('\n💡 Don\'t forget to commit your changes!', 'yellow');
    
  } catch (error) {
    log(`❌ Error updating version: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
