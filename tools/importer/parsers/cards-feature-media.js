/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-feature-media. Base: cards.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="Feature grid"]
 *
 * Output (blocks/cards-feature-media/README.md): one row per card:
 *   cell1 = image (or poster + MP4 link(s)) | cell2 = paragraph
 *
 * Source structure (validated): section > div > ul > li x3. Each li holds a
 * .rich-text-content > p and either picture + video > source (card 1) or a plain img (cards 2, 3).
 * Iteration keys on the <li> block wrappers.
 */

function isNotMedia(media) {
  return /not\s*\(/.test(media || '');
}

function getPoster(scope, document) {
  const picture = scope.querySelector('picture');
  const img = scope.querySelector('picture img, img:not([src^="data:"])');
  let src = '';
  if (picture) {
    const sources = [...picture.querySelectorAll('source[srcset]')];
    const desk = sources.find((s) => !isNotMedia(s.getAttribute('media')));
    if (desk) src = desk.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0];
  }
  if (!src && img) src = img.getAttribute('src') || '';
  if (!src) return null;
  const out = document.createElement('img');
  out.src = src;
  out.alt = img?.getAttribute('alt') || '';
  return out;
}

function getVideoUrls(video) {
  if (!video) return [];
  const sources = [...video.querySelectorAll('source[src]')]
    .map((s) => ({ src: s.getAttribute('src'), media: s.getAttribute('media') || '' }))
    .filter((s) => s.src);
  if (video.getAttribute('src')) sources.unshift({ src: video.getAttribute('src'), media: '' });
  if (!sources.length) return [];
  const desktop = sources.find((s) => !isNotMedia(s.media)) || sources[0];
  let mobile = sources.find((s) => isNotMedia(s.media) && s.src !== desktop.src);
  if (!mobile && sources.length > 1) mobile = sources[sources.length - 1];
  return [desktop.src, mobile?.src].filter((s, i, arr) => s && arr.indexOf(s) === i);
}

function linkPara(href, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = href;
  p.append(a);
  return p;
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('ul > li')];
  if (!items.length) items = [...element.querySelectorAll('[class*="card"]')];

  const cells = [];
  items.forEach((item) => {
    const mediaCell = [];
    const poster = getPoster(item, document);
    if (poster) mediaCell.push(poster);
    getVideoUrls(item.querySelector('video')).forEach((url) => mediaCell.push(linkPara(url, document)));

    const textCell = [...item.querySelectorAll('h2, h3, h4, p')]
      .filter((el) => el.textContent.trim() && !el.closest('button'));
    if (!mediaCell.length && !textCell.length) return;
    cells.push([mediaCell.length ? mediaCell : '', textCell.length ? textCell : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature-media', cells });
  element.replaceWith(block);
}
