/* eslint-disable */
/* global WebImporter */
/**
 * Parser for scrolling-slides-media. Base: scrolling-slides (custom).
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="#performance"] .container-fluid
 *
 * Output (blocks/scrolling-slides-media/README.md): one row per slide:
 *   cell1 = poster image + desktop MP4 link + mobile MP4 link | cell2 = H2 + paragraph
 *
 * Source structure (validated): the media stack and the text stack are separate trees.
 *   media: N x [picture (source[media="(min-width: 1024px)"] desktop poster, img mobile poster)
 *           + video > source[media="(min-width: 1024px)"] desktop + source[media^="not"] mobile]
 *   text : N x [h2 (st-line words + span.sr-only copy) + div > div > p]
 * Slides are paired by index (video i <-> h2 i). Iteration keys on block-level <video>/<h2>,
 * never on anchors/buttons.
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function headingText(h) {
  const sr = h.querySelector('.sr-only');
  if (sr && clean(sr.textContent)) return clean(sr.textContent);
  return clean(h.textContent);
}

function isNotMedia(media) {
  return /not\s*\(/.test(media || '');
}

function mediaScopeFor(video) {
  let scope = video.parentElement;
  while (scope && !scope.querySelector('picture, img:not([src^="data:"])')
    && scope.parentElement && scope.parentElement.querySelectorAll('video').length === 1) {
    scope = scope.parentElement;
  }
  return scope || video;
}

function getPoster(scope, document) {
  const picture = scope.querySelector('picture');
  const img = scope.querySelector('picture img, img:not([src^="data:"])');
  let src = '';
  if (picture) {
    const desk = [...picture.querySelectorAll('source[srcset]')]
      .find((s) => s.getAttribute('media') && !isNotMedia(s.getAttribute('media')));
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
  const videos = [...element.querySelectorAll('video')];
  const headings = [...element.querySelectorAll('h2, h3')];

  // Fallback media when a slide has a poster but no video
  const pictures = videos.length ? [] : [...element.querySelectorAll('picture')];
  const mediaCount = videos.length || pictures.length;
  const count = Math.max(mediaCount, headings.length);

  const cells = [];
  for (let i = 0; i < count; i += 1) {
    const mediaCell = [];
    if (videos[i]) {
      const poster = getPoster(mediaScopeFor(videos[i]), document);
      if (poster) mediaCell.push(poster);
      getVideoUrls(videos[i]).forEach((url) => mediaCell.push(linkPara(url, document)));
    } else if (pictures[i]) {
      const poster = getPoster(pictures[i].parentElement || pictures[i], document);
      if (poster) mediaCell.push(poster);
    }

    const textCell = [];
    const h = headings[i];
    if (h) {
      const heading = document.createElement('h2');
      heading.textContent = headingText(h);
      textCell.push(heading);
      const wrap = h.parentElement;
      [...wrap.querySelectorAll('p')]
        .filter((p) => !h.contains(p) && clean(p.textContent))
        .forEach((p) => textCell.push(p));
    }
    if (!mediaCell.length && !textCell.length) continue;
    cells.push([mediaCell.length ? mediaCell : '', textCell.length ? textCell : '']);
  }

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'scrolling-slides-media', cells });
  element.replaceWith(block);
}
