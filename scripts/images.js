/*
 * Image helper
 * Same signature as createOptimizedPicture in aem.js. Images still hosted on Contentful
 * (images.ctfassets.net) reject the EDS media query params, so those get Contentful's
 * own Images API params instead (w, fm, q). Everything else goes to aem.js unchanged.
 */

import { createOptimizedPicture as createEdsPicture } from './aem.js';

const CONTENTFUL_HOST = 'images.ctfassets.net';

const DEFAULT_BREAKPOINTS = [
  { media: '(min-width: 600px)', width: '2000' },
  { width: '750' },
];

function contentfulUrl(url, width, format) {
  const u = new URL(url);
  u.search = '';
  u.searchParams.set('w', width);
  if (format) u.searchParams.set('fm', format);
  u.searchParams.set('q', '80');
  return u.href;
}

/**
 * Creates a responsive picture element.
 * @param {string} src Image URL
 * @param {string} [alt] Alt text
 * @param {boolean} [eager] Load eagerly
 * @param {Array} [breakpoints] Breakpoints and widths
 * @returns {Element} The picture element
 */
// eslint-disable-next-line import/prefer-default-export
export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = DEFAULT_BREAKPOINTS) {
  const url = new URL(src, window.location.href);
  if (url.hostname !== CONTENTFUL_HOST) return createEdsPicture(src, alt, eager, breakpoints);

  const picture = document.createElement('picture');
  const ext = url.pathname.split('.').pop().toLowerCase();
  const fallbackFormat = ext === 'png' ? 'png' : 'jpg';

  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', contentfulUrl(url, br.width, 'webp'));
    picture.append(source);
  });

  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', contentfulUrl(url, br.width, fallbackFormat));
      picture.append(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      img.setAttribute('src', contentfulUrl(url, br.width, fallbackFormat));
      picture.append(img);
    }
  });

  return picture;
}
