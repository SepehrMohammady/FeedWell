// The "What's New" popup covers the last two releases, newest first, so someone
// who skipped an update still hears about it. On each release: add the new
// release at the top, drop the oldest one, and remove its strings from every
// locale (titles may reuse existing keys, such as the Settings row names).
export const WHATS_NEW_RELEASES = [
  {
    version: '1.18.1',
    items: [
      { icon: 'compass', title: 'settings.appTour', body: 'whatsNew.tourBody' },
      { icon: 'language', title: 'settings.autoTranslate', body: 'whatsNew.autoTranslateBody' },
      { icon: 'grid', title: 'whatsNew.widgetTitle', body: 'whatsNew.widgetBody' },
      { icon: 'globe', title: 'whatsNew.languages118Title', body: 'whatsNew.languages118Body' },
    ],
  },
  {
    version: '1.17.0',
    items: [
      { icon: 'sunny', title: 'settings.keepAwake', body: 'whatsNew.keepAwakeBody' },
      { icon: 'globe', title: 'whatsNew.languages117Title', body: 'whatsNew.languages117Body' },
    ],
  },
];
