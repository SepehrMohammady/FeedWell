// The app tour, in order. `nav` holds navigate() arguments for the screen the
// step lives on; `target` is an id a screen registered with useTourTarget().
// A step with no target — or whose target isn't on screen (e.g. no feeds yet) —
// is shown as a centred card, so every function is still explained.

const FEED_LIST = ['Feeds', { screen: 'FeedList' }];
const ADD_FEED = ['Feeds', { screen: 'AddFeed' }];

export const TOUR_STEPS = [
  { key: 'welcome', icon: 'sparkles-outline', titleKey: 'tour.welcomeTitle', bodyKey: 'tour.welcomeBody' },
  { key: 'add', nav: FEED_LIST, target: 'feeds.add', icon: 'add-circle-outline', titleKey: 'tour.addTitle', bodyKey: 'tour.addBody' },
  { key: 'addUrl', nav: ADD_FEED, target: 'addFeed.url', icon: 'link-outline', titleKey: 'tour.addUrlTitle', bodyKey: 'tour.addUrlBody' },
  { key: 'popular', nav: ADD_FEED, target: 'addFeed.popular', icon: 'grid-outline', titleKey: 'tour.popularTitle', bodyKey: 'tour.popularBody' },
  { key: 'filter', nav: FEED_LIST, target: 'feeds.filter', icon: 'funnel-outline', titleKey: 'tour.filterTitle', bodyKey: 'tour.filterBody' },
  { key: 'sort', nav: FEED_LIST, target: 'feeds.sort', icon: 'swap-vertical-outline', titleKey: 'tour.sortTitle', bodyKey: 'tour.sortBody' },
  { key: 'markAll', nav: FEED_LIST, target: 'feeds.readAll', icon: 'checkmark-done', titleKey: 'tour.markAllTitle', bodyKey: 'tour.markAllBody' },
  { key: 'search', nav: FEED_LIST, target: 'feeds.search', icon: 'search-outline', titleKey: 'tour.searchTitle', bodyKey: 'tour.searchBody' },
  { key: 'readingPosition', nav: FEED_LIST, target: 'feeds.readingPosition', icon: 'bookmark-outline', titleKey: 'tour.readingPositionTitle', bodyKey: 'tour.readingPositionBody' },
  { key: 'sounds', nav: FEED_LIST, target: 'feeds.sounds', icon: 'musical-notes-outline', titleKey: 'tour.soundsTitle', bodyKey: 'tour.soundsBody' },
  { key: 'reader', icon: 'reader-outline', titleKey: 'tour.readerTitle', bodyKey: 'tour.readerBody' },
  { key: 'saved', nav: ['ReadLater', { screen: 'ReadLaterList' }], target: 'saved.header', icon: 'save-outline', titleKey: 'tour.savedTitle', bodyKey: 'tour.savedBody' },
  { key: 'settings', nav: ['Settings'], target: 'settings.header', icon: 'settings-outline', titleKey: 'tour.settingsTitle', bodyKey: 'tour.settingsBody' },
  { key: 'done', icon: 'checkmark-circle-outline', titleKey: 'tour.doneTitle', bodyKey: 'tour.doneBody' },
];
