// What swiping an article in the Feeds list can do, as Outlook does with
// mail: each direction is set in Settings, Feeds. 'read' and 'save' work both
// ways (read or unread again, saved or out of Saved again).
export const SWIPE_ACTIONS = ['none', 'read', 'save', 'share', 'remove'];
export const DEFAULT_SWIPE_RIGHT = 'read';
export const DEFAULT_SWIPE_LEFT = 'save';

// For Settings: each action's name, what it does and its icon
export const SWIPE_ACTION_INFO = {
  none: { titleKey: 'swipe.none', descKey: 'swipe.noneDesc', icon: 'remove-circle-outline' },
  read: { titleKey: 'swipe.read', descKey: 'swipe.readDesc', icon: 'mail-open-outline' },
  save: { titleKey: 'swipe.save', descKey: 'swipe.saveDesc', icon: 'bookmark-outline' },
  share: { titleKey: 'swipe.share', descKey: 'swipe.shareDesc', icon: 'share-outline' },
  remove: { titleKey: 'swipe.remove', descKey: 'swipe.removeDesc', icon: 'trash-outline' },
};
