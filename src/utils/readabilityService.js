import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

/**
 * Extract clean article content using Mozilla Readability.
 * Returns null if extraction fails (caller should fall back to regex approach).
 */
export function extractWithReadability(html, url) {
  try {
    const { document } = parseHTML(html);

    // Set base URL so Readability can resolve relative links/images
    try {
      const base = document.createElement('base');
      base.setAttribute('href', url);
      if (document.head) {
        document.head.appendChild(base);
      }
    } catch (e) {
      // Non-critical, continue without base URL
    }

    const article = new Readability(document, {
      charThreshold: 100,
    }).parse();

    if (!article || !article.content) return null;

    return {
      title: article.title || '',
      content: article.content,       // Clean HTML with images preserved
      textContent: article.textContent || '', // Plain text
      byline: article.byline || '',
      excerpt: article.excerpt || '',
      siteName: article.siteName || '',
    };
  } catch (error) {
    console.log('Readability extraction failed:', error.message);
    return null;
  }
}

/**
 * Parse Readability's HTML output into a sequence of content blocks.
 * Each block is either { type: 'text', content } or { type: 'image', src, alt, caption }.
 * This preserves the interleaving of text and images from the original article.
 */
export function parseReadabilityContent(html) {
  if (!html) return [];

  const blocks = [];

  // Split HTML at image/figure boundaries, keeping the delimiters
  const splitRegex = /(<figure[\s>][\s\S]*?<\/figure>|<img\s[^>]*\/?>)/gi;
  const parts = html.split(splitRegex);

  for (const part of parts) {
    if (!part || !part.trim()) continue;

    // Check if this part is an image or figure
    const isImagePart = /^<(?:figure|img)\s/i.test(part.trim());

    if (isImagePart) {
      const imgMatch = part.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch && imgMatch[1]) {
        const src = imgMatch[1];

        // Filter out tracking pixels, tiny images, and ad images
        const isTrackingPixel =
          /(?:1x1|pixel|tracker|beacon|analytics|doubleclick|googlesyndication)/i.test(src) ||
          /width=["']1["']/i.test(part) ||
          /height=["']1["']/i.test(part);

        if (!isTrackingPixel) {
          const altMatch = part.match(/alt=["']([^"']*)["']/i);
          const captionMatch = part.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);

          blocks.push({
            type: 'image',
            src: src,
            alt: altMatch ? altMatch[1] : '',
            caption: captionMatch ? htmlToPlainText(captionMatch[1]).trim() : '',
          });
        }
      }
    } else {
      // Text block — convert HTML to plain text
      const text = htmlToPlainText(part).trim();
      if (text && text.length > 1) {
        blocks.push({ type: 'text', content: text });
      }
    }
  }

  return blocks;
}

/**
 * Convert HTML to clean plain text, preserving paragraph structure.
 */
function htmlToPlainText(html) {
  if (!html) return '';

  let text = html;

  // Convert block-level elements to line breaks
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/blockquote>/gi, '\n\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' ');
  text = text.replace(/<\/th>/gi, ' ');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#0?39;|&apos;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#8217;/g, '\u2019');
  text = text.replace(/&#8216;/g, '\u2018');
  text = text.replace(/&#8220;/g, '\u201C');
  text = text.replace(/&#8221;/g, '\u201D');
  text = text.replace(/&#8211;/g, '\u2013');
  text = text.replace(/&#8212;/g, '\u2014');
  text = text.replace(/&#8230;/g, '\u2026');
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&#x2F;/g, '/');
  // Numeric entities
  text = text.replace(/&#(\d+);/g, (_, code) => {
    const n = parseInt(code, 10);
    return n > 0 && n < 0x10FFFF ? String.fromCodePoint(n) : '';
  });
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const n = parseInt(hex, 16);
    return n > 0 && n < 0x10FFFF ? String.fromCodePoint(n) : '';
  });

  // Normalize whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]*\n[ \t]*/g, '\n');

  return text.trim();
}
