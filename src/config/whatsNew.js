// The "What's New" popup covers the last two releases, newest first, so someone
// who skipped an update still hears about it. On each release: add the new
// release at the top, drop the oldest one, and remove its strings from every
// locale (titles may reuse existing keys, such as the Settings row names).
export const WHATS_NEW_RELEASES = [
  {
    version: '1.19.0',
    items: [
      { icon: 'grid', title: 'home.customize', body: 'whatsNew.customizeHomeBody' },
      { icon: 'trash', title: 'whatsNew.removeArticlesTitle', body: 'whatsNew.removeArticlesBody' },
      { icon: 'newspaper', title: 'whatsNew.oneSourceTitle', body: 'whatsNew.oneSourceBody' },
    ],
  },
  {
    version: '1.18.2',
    items: [
      { icon: 'arrow-undo', title: 'whatsNew.backFixTitle', body: 'whatsNew.backFixBody' },
    ],
  },
];
