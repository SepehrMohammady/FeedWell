// The "What's New" popup covers the last two releases, newest first, so someone
// who skipped an update still hears about it. On each release: add the new
// release at the top, drop the oldest one, and remove its strings from every
// locale (titles may reuse existing keys, such as the Settings row names).
export const WHATS_NEW_RELEASES = [
  {
    version: '1.21.1',
    items: [
      { icon: 'reorder-two', title: 'whatsNew.linesFixTitle', body: 'whatsNew.linesFixBody' },
    ],
  },
  {
    version: '1.21.0',
    items: [
      { icon: 'play-circle', title: 'whatsNew.slideshowTitle', body: 'whatsNew.slideshowBody' },
      { icon: 'swap-horizontal', title: 'settings.sectionSwipeActions', body: 'whatsNew.swipeBody' },
      { icon: 'filter', title: 'whatsNew.filterTitle', body: 'whatsNew.filterBody' },
      { icon: 'contrast', title: 'settings.dimReadArticles', body: 'whatsNew.unreadBody' },
    ],
  },
];
