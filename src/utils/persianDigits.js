// Convert ASCII digits within a string/number to Persian (Farsi) digits.
// Used for number/date localization when the app language is Farsi. We do this
// explicitly (not via Intl) because Hermes on Android lacks full ICU data.

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input) {
  if (input == null) return input;
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export default toPersianDigits;
