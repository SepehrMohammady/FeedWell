/**
 * Centralized version management for FeedWell
 * Update this file to maintain version consistency across the entire app
 */

export const APP_VERSION = {
  // Main version number (semantic versioning: major.minor.patch)
  version: '0.6.4',
  
  // Build/version code for app stores (increment for each release)
  buildNumber: 64,
  
  // Release stage
  stage: 'Beta', // 'Alpha', 'Beta', 'RC', 'Stable'
  
  // Full version string for display
  get fullVersion() {
    return `${this.version} (${this.stage})`;
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

export default APP_VERSION;