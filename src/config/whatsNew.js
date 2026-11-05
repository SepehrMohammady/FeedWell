// The "What's New" popup covers the last two releases, newest first, so someone
// who skipped an update still hears about it. On each release: add the new
// release at the top, drop the oldest one, and remove its strings from every
// locale (titles may reuse existing keys, such as the Settings row names).
export const WHATS_NEW_RELEASES = [
  {
    version: '1.20.2',
    items: [
      { icon: 'pricetag', title: 'whatsNew.salesTitle', body: 'whatsNew.salesBody' },
      { icon: 'calendar', title: 'whatsNew.datesTitle', body: 'whatsNew.datesBody' },
    ],
  },
  {
    version: '1.20.1',
    items: [
      { icon: 'car', title: 'settings.motionCues', body: 'whatsNew.motionCuesBody' },
      { icon: 'archive', title: 'whatsNew.restoreFitsTitle', body: 'whatsNew.restoreFitsBody' },
    ],
  },
];
