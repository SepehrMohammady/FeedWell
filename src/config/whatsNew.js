// The "What's New" popup covers the last two releases, newest first, so someone
// who skipped an update still hears about it. On each release: add the new
// release at the top, drop the oldest one, and remove its strings from every
// locale (titles may reuse existing keys, such as the Settings row names).
export const WHATS_NEW_RELEASES = [
  {
    version: '1.20.1',
    items: [
      { icon: 'car', title: 'settings.motionCues', body: 'whatsNew.motionCuesBody' },
      { icon: 'archive', title: 'whatsNew.restoreFitsTitle', body: 'whatsNew.restoreFitsBody' },
    ],
  },
  {
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
];
