// The web build has no Android assets: without these, every Inter family name
// in theme/type.js falls back to the browser's serif font. Loaded with
// expo-font under the same names.
export const INTERFACE_FONT_ASSETS = {
  'Inter-Regular': require('../../android/app/src/main/assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../../android/app/src/main/assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../../android/app/src/main/assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('../../android/app/src/main/assets/fonts/Inter-Bold.ttf'),
};
