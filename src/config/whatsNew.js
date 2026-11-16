// The "What's New" popup covers the last two releases, newest first, so someone
// who skipped an update still hears about it. On each release: add the new
// release at the top, drop the oldest one, and remove its strings from every
// locale (titles may reuse existing keys, such as the Settings row names).
export const WHATS_NEW_RELEASES = [
  {
    version: '1.21.3',
    items: [
      { icon: 'link', title: 'whatsNew.shortAddressTitle', body: 'whatsNew.shortAddressBody' },
      { icon: 'shield-checkmark', title: 'whatsNew.lessGoogleTitle', body: 'whatsNew.lessGoogleBody' },
      { icon: 'notifications', title: 'whatsNew.oneReminderTitle', body: 'whatsNew.oneReminderBody' },
    ],
  },
  {
    version: '1.21.2',
    items: [
      { icon: 'search', title: 'whatsNew.findFeedTitle', body: 'whatsNew.findFeedBody' },
      { icon: 'refresh', title: 'whatsNew.feedFixTitle', body: 'whatsNew.feedFixBody' },
    ],
  },
];
