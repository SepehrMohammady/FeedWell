// The "What's New" popup covers the last two releases, newest first, so someone
// who skipped an update still hears about it. On each release: add the new
// release at the top, drop the oldest one, and remove its strings from every
// locale (titles may reuse existing keys, such as the Settings row names).
export const WHATS_NEW_RELEASES = [
  {
    // The version is the user's to confirm before the release
    version: '1.20.0',
    items: [
      { icon: 'color-palette', title: 'whatsNew.newLookTitle', body: 'whatsNew.newLookBody' },
      { icon: 'contrast', title: 'whatsNew.systemModeTitle', body: 'whatsNew.systemModeBody' },
      { icon: 'list', title: 'whatsNew.settingsTitle', body: 'whatsNew.settingsBody' },
      { icon: 'save', title: 'whatsNew.backupTitle', body: 'whatsNew.backupBody' },
      { icon: 'time', title: 'backup.autoBackup', body: 'whatsNew.autoBackupBody' },
      { icon: 'refresh', title: 'settings.resetTitle', body: 'whatsNew.resetBody' },
    ],
  },
  {
    version: '1.19.0',
    items: [
      { icon: 'grid', title: 'home.customize', body: 'whatsNew.customizeHomeBody' },
      { icon: 'trash', title: 'whatsNew.removeArticlesTitle', body: 'whatsNew.removeArticlesBody' },
      { icon: 'newspaper', title: 'whatsNew.oneSourceTitle', body: 'whatsNew.oneSourceBody' },
    ],
  },
];
