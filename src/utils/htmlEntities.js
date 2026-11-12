// HTML character references ("&#160;", "&#x2019;", "&eacute;") turned into
// the characters they stand for, for titles and descriptions that reach the
// app as plain text. The feed parser used to know a short list only, so any
// other reference showed as typed ("NGC &#160;4449").

// The Latin-1 names, in code point order from U+00A0
const LATIN1 = (
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr '
  + 'deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest '
  + 'Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml '
  + 'ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig '
  + 'agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml '
  + 'eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'
).split(' ');

// The other names of HTML 4, and apos (lang and rang with the code points
// browsers give them today)
const NAMED = {
  quot: 34, amp: 38, apos: 39, lt: 60, gt: 62,
  OElig: 338, oelig: 339, Scaron: 352, scaron: 353, Yuml: 376, fnof: 402, circ: 710, tilde: 732,
  Alpha: 913, Beta: 914, Gamma: 915, Delta: 916, Epsilon: 917, Zeta: 918, Eta: 919, Theta: 920,
  Iota: 921, Kappa: 922, Lambda: 923, Mu: 924, Nu: 925, Xi: 926, Omicron: 927, Pi: 928, Rho: 929,
  Sigma: 931, Tau: 932, Upsilon: 933, Phi: 934, Chi: 935, Psi: 936, Omega: 937,
  alpha: 945, beta: 946, gamma: 947, delta: 948, epsilon: 949, zeta: 950, eta: 951, theta: 952,
  iota: 953, kappa: 954, lambda: 955, mu: 956, nu: 957, xi: 958, omicron: 959, pi: 960, rho: 961,
  sigmaf: 962, sigma: 963, tau: 964, upsilon: 965, phi: 966, chi: 967, psi: 968, omega: 969,
  thetasym: 977, upsih: 978, piv: 982,
  ensp: 8194, emsp: 8195, thinsp: 8201, zwnj: 8204, zwj: 8205, lrm: 8206, rlm: 8207,
  ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222,
  dagger: 8224, Dagger: 8225, bull: 8226, hellip: 8230, permil: 8240, prime: 8242, Prime: 8243,
  lsaquo: 8249, rsaquo: 8250, oline: 8254, frasl: 8260, euro: 8364,
  image: 8465, weierp: 8472, real: 8476, trade: 8482, alefsym: 8501,
  larr: 8592, uarr: 8593, rarr: 8594, darr: 8595, harr: 8596, crarr: 8629,
  lArr: 8656, uArr: 8657, rArr: 8658, dArr: 8659, hArr: 8660,
  forall: 8704, part: 8706, exist: 8707, empty: 8709, nabla: 8711, isin: 8712, notin: 8713, ni: 8715,
  prod: 8719, sum: 8721, minus: 8722, lowast: 8727, radic: 8730, prop: 8733, infin: 8734, ang: 8736,
  and: 8743, or: 8744, cap: 8745, cup: 8746, int: 8747, there4: 8756, sim: 8764, cong: 8773,
  asymp: 8776, ne: 8800, equiv: 8801, le: 8804, ge: 8805, sub: 8834, sup: 8835, nsub: 8836,
  sube: 8838, supe: 8839, oplus: 8853, otimes: 8855, perp: 8869, sdot: 8901,
  lceil: 8968, rceil: 8969, lfloor: 8970, rfloor: 8971, lang: 10216, rang: 10217, loz: 9674,
  spades: 9824, clubs: 9827, hearts: 9829, diams: 9830,
};
LATIN1.forEach((name, index) => { NAMED[name] = 160 + index; });

// Numbers 128 to 159 are not characters; pages that use them mean the
// Windows-1252 ones ("&#146;" for an apostrophe), and browsers read them so
const WINDOWS_1252 = {
  128: 8364, 130: 8218, 131: 402, 132: 8222, 133: 8230, 134: 8224, 135: 8225, 136: 710, 137: 8240,
  138: 352, 139: 8249, 140: 338, 142: 381, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 149: 8226,
  150: 8211, 151: 8212, 152: 732, 153: 8482, 154: 353, 155: 8250, 156: 339, 158: 382, 159: 376,
};

const REFERENCE = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/g;
const SURROGATE = /[\uD800-\uDFFF]/;

// The character for a code point, as the lists show it: a non-breaking space
// and a tab are plain spaces, a line feed stays, and what is no character
// (other controls, numbers past the last code point) leaves nothing
function characterFor(code) {
  if (code >= 128 && code <= 159) code = WINDOWS_1252[code] || 0;
  if (code === 160 || code === 9) return ' ';
  if (code === 10) return '\n';
  if (code < 32 || code === 127 || code > 0x10FFFF) return '';
  if (code > 0xFFFF) return String.fromCodePoint(code);
  return String.fromCharCode(code);
}

// A half of a pair with no other half is no character either (some feeds
// write an emoji as its two halves, "&#55357;&#56832;", which join up here)
function withoutLoneSurrogates(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xDC00 && next <= 0xDFFF) {
        out += text[i] + text[i + 1];
        i++;
      }
    } else if (unit < 0xDC00 || unit > 0xDFFF) {
      out += text[i];
    }
  }
  return out;
}

function decodeOnce(text) {
  let halves = false;
  const decoded = text.replace(REFERENCE, (reference, body) => {
    if (body[0] !== '#') {
      const code = NAMED[body];
      return code === undefined ? reference : characterFor(code);
    }
    const hex = body[1] === 'x' || body[1] === 'X';
    const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (code >= 0xD800 && code <= 0xDFFF) halves = true;
    return characterFor(code);
  });
  return halves ? withoutLoneSurrogates(decoded) : decoded;
}

/**
 * The text with its character references decoded. Feeds often escape their
 * text twice ("&amp;#8217;"), so what a pass uncovers is decoded too, three
 * passes at most. A name the table doesn't know stays as it is.
 */
export function decodeHtmlEntities(text) {
  if (!text) return '';
  let decoded = String(text);
  for (let pass = 0; pass < 3 && decoded.indexOf('&') !== -1; pass++) {
    const next = decodeOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

// The plain-text fields the parser decodes, offlineContent being a saved
// article's full text (htmlContent is markup, where references belong)
const TEXT_FIELDS = ['title', 'description', 'content', 'offlineContent', 'feedTitle'];

// Spaces as the parser leaves them: a decoded non-breaking space next to a
// space would otherwise show as a gap ("NGC  4449")
const tidySpaces = (text) => text
  .replace(/[ \t]+/g, ' ')
  .replace(/ ?\n ?/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

/**
 * Stored articles or feeds with the references an older parser left in their
 * text decoded. Gives back the same array when there is nothing to change, so
 * a caller can tell whether to save.
 */
export function withDecodedText(items) {
  if (!Array.isArray(items)) return items;
  let changed = false;
  const repaired = items.map((item) => {
    if (!item || typeof item !== 'object') return item;
    let fixed = null;
    for (const field of TEXT_FIELDS) {
      const value = item[field];
      if (typeof value !== 'string' || value.indexOf('&') === -1) continue;
      const decoded = decodeHtmlEntities(value);
      if (decoded !== value) {
        fixed = fixed || { ...item };
        fixed[field] = tidySpaces(decoded);
      }
    }
    if (fixed) changed = true;
    return fixed || item;
  });
  return changed ? repaired : items;
}
