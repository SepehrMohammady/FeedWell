// The sections Home can show, in their default order. Customize Home lets
// people show, hide and reorder them; the choice is saved as an ordered list of
// { id, visible } under the `homeSections` setting. A section that holds nothing
// (no bookmarks, no saved articles) stays out of the way on its own.
export const HOME_SECTIONS = [
  { id: 'overview', titleKey: 'home.overview', icon: 'stats-chart-outline', defaultVisible: true },
  { id: 'quickActions', titleKey: 'home.quickActions', icon: 'flash-outline', defaultVisible: false },
  { id: 'continueReading', titleKey: 'home.continueReading', icon: 'book-outline', defaultVisible: true },
  { id: 'recentArticles', titleKey: 'home.recentArticles', icon: 'time-outline', defaultVisible: true },
  { id: 'savedArticles', titleKey: 'home.recentlySaved', icon: 'save-outline', defaultVisible: true },
  { id: 'yourFeeds', titleKey: 'home.yourFeeds', icon: 'newspaper-outline', defaultVisible: false },
  { id: 'recentNotes', titleKey: 'home.recentNotes', icon: 'create-outline', defaultVisible: false },
];

export const DEFAULT_HOME_SECTIONS = HOME_SECTIONS.map(({ id, defaultVisible }) => ({ id, visible: defaultVisible }));

// Saved layouts keep their order and choices. Sections added in a later version
// join at the end with their default visibility; ids no longer known are dropped.
export function normalizeHomeSections(saved) {
  if (!Array.isArray(saved)) return DEFAULT_HOME_SECTIONS;
  const known = new Map(HOME_SECTIONS.map((section) => [section.id, section]));
  const seen = new Set();
  const result = [];
  saved.forEach((entry) => {
    if (!entry || !known.has(entry.id) || seen.has(entry.id)) return;
    seen.add(entry.id);
    result.push({ id: entry.id, visible: entry.visible !== false });
  });
  HOME_SECTIONS.forEach(({ id, defaultVisible }) => {
    if (!seen.has(id)) result.push({ id, visible: defaultVisible });
  });
  return result;
}
