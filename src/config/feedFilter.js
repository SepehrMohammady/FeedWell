// The Feeds list's filter beyond read and unread, in groups of choices as
// TuneWell's library filter has them: any of the feeds picked, articles from
// one stretch of time, and each "show only" choice on top. The read or unread
// choice stays its own setting (articleFilter), as it always was.

export const EMPTY_FEED_FILTER = Object.freeze({ feeds: [], published: 'any', only: [] });

// Published: today, in the past 7 days, or in the past 30 days
export const PUBLISHED_RANGES = ['today', 'week', 'month'];

// Show only: saved for later, with a note, from a starred feed, with a picture
export const ONLY_CHOICES = ['saved', 'notes', 'starred', 'images'];

/** A stored filter made safe to use: unknown values dropped, missing ones empty */
export function normalizeFeedFilter(value) {
  if (!value || typeof value !== 'object') return EMPTY_FEED_FILTER;
  const feeds = Array.isArray(value.feeds) ? value.feeds.filter((url) => typeof url === 'string' && url) : [];
  const published = PUBLISHED_RANGES.includes(value.published) ? value.published : 'any';
  const only = Array.isArray(value.only) ? ONLY_CHOICES.filter((choice) => value.only.includes(choice)) : [];
  return { feeds: [...new Set(feeds)], published, only };
}

/** How many choices are on, for the badge on the filter button */
export function feedFilterCount(filter) {
  return filter.feeds.length + (filter.published !== 'any' ? 1 : 0) + filter.only.length;
}

/** The earliest publish time a range lets through, or 0 for any time */
export function publishedSince(range, now = new Date()) {
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (range === 'week') return now.getTime() - 7 * 24 * 3600 * 1000;
  if (range === 'month') return now.getTime() - 30 * 24 * 3600 * 1000;
  return 0;
}

/**
 * Whether an article passes one "show only" choice. `context` holds the ids
 * of saved articles and of articles with a note, and the starred feeds.
 */
export function passesOnly(article, choice, context) {
  switch (choice) {
    case 'saved':
      return context.savedIds.has(article.id);
    case 'notes':
      return context.noteIds.has(article.id);
    case 'starred':
      return context.starredUrls.has(article.feedUrl);
    case 'images':
      return !!article.imageUrl;
    default:
      return true;
  }
}

/**
 * Whether an article passes the filter, leaving out one group when asked, so
 * each group's choices can show how many articles they would add
 */
export function passesFeedFilter(article, filter, context, skipGroup = null) {
  if (skipGroup !== 'feeds' && filter.feeds.length > 0 && !filter.feeds.includes(article.feedUrl)) return false;
  if (skipGroup !== 'published' && filter.published !== 'any') {
    const time = new Date(article.publishedDate || 0).getTime();
    if (Number.isNaN(time) || time < context.since) return false;
  }
  if (skipGroup !== 'only') {
    for (const choice of filter.only) {
      if (!passesOnly(article, choice, context)) return false;
    }
  }
  return true;
}
