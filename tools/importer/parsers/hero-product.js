/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-product. Base: hero.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: #r-product-hero
 *
 * Output (blocks/hero-product/README.md):
 *   row 1: poster image + desktop MP4 link + mobile MP4 link
 *   row 2: promo link
 *   row 3: H1, display line (p > strong), description, product name, price, Pre-order link
 *
 * Source structure (validated against source.html and the live page):
 *   picture (source[media="(orientation: landscape)"] = desktop poster, img = mobile poster)
 *   video > source[src$=".mp4"] x3 (desktop landscape, mobile, mobile "not (orientation: landscape)")
 *   a[href] > span > .rich-text-content > p      promo strip
 *   h1                                           product name heading
 *   p.hero-6 + .st-line words + span.sr-only     animated display line
 *   .rich-text-content > p                       description (with <sup>)
 *   p (product name), p ($price), a (Pre-order)  buy box
 */

const PRICE = /[$€£¥]\s?\d[\d.,]*/;

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Poster image: prefer the landscape (desktop) poster from <picture>, else the <img>. */
function getPoster(scope, document) {
  const picture = scope.querySelector('picture');
  const img = scope.querySelector('picture img, img:not([src^="data:"])');
  if (!img && !picture) return null;
  let src = '';
  const landscape = picture && [...picture.querySelectorAll('source[srcset]')]
    .find((s) => /\(orientation:\s*landscape\)/.test(s.getAttribute('media') || '')
      && !/not\s*\(/.test(s.getAttribute('media') || ''));
  if (landscape) src = landscape.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0];
  if (!src && img) src = img.getAttribute('src') || '';
  if (!src) return null;
  const out = document.createElement('img');
  out.src = src;
  out.alt = img?.getAttribute('alt') || '';
  return out;
}

/** Desktop + mobile MP4 URLs from <video> sources (desktop first, mobile second). */
function getVideoUrls(scope) {
  const video = scope.querySelector('video');
  if (!video) return [];
  const sources = [...video.querySelectorAll('source[src]')]
    .map((s) => ({ src: s.getAttribute('src'), media: s.getAttribute('media') || '' }))
    .filter((s) => s.src);
  if (video.getAttribute('src')) sources.unshift({ src: video.getAttribute('src'), media: '' });
  if (!sources.length) return [];
  const desktop = sources.find((s) => !/not\s*\(/.test(s.media)) || sources[0];
  let mobile = sources.find((s) => /not\s*\(/.test(s.media) && s.src !== desktop.src);
  if (!mobile && sources.length > 1) mobile = sources[sources.length - 1];
  return [desktop.src, mobile?.src].filter((s, i, arr) => s && arr.indexOf(s) === i);
}

function linkPara(href, text, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text || href;
  p.append(a);
  return p;
}

/** Text of an animated split-text line: the sr-only copy wins, else flattened words. */
function animatedText(el) {
  if (!el) return '';
  const sr = el.querySelector('.sr-only');
  if (sr) return clean(sr.textContent);
  return clean(el.textContent);
}

export default function parse(element, { document }) {
  const cells = [];

  // Row 1: media (poster + MP4 links)
  const mediaCell = [];
  const poster = getPoster(element, document);
  if (poster) mediaCell.push(poster);
  getVideoUrls(element).forEach((url) => mediaCell.push(linkPara(url, url, document)));
  if (mediaCell.length) cells.push([mediaCell]);

  // Row 2: promo strip link (the anchor that wraps rich text, not the Pre-order CTA)
  const h1 = element.querySelector('h1');
  const promoAnchor = [...element.querySelectorAll('a[href]')].find(
    (a) => a.querySelector('p, .rich-text-content, span') && (!h1 || (h1.compareDocumentPosition(a) & 2)),
  );
  if (promoAnchor) {
    cells.push([linkPara(promoAnchor.getAttribute('href'), clean(promoAnchor.textContent), document)]);
  }

  // Row 3: content
  const content = [];
  if (h1) {
    const heading = document.createElement('h1');
    heading.textContent = clean(h1.textContent);
    content.push(heading);
  }

  // Display line: animated split-text (sr-only copy) right after the H1
  let displayText = '';
  const titleWrap = h1?.parentElement;
  if (titleWrap) {
    const sr = [...titleWrap.querySelectorAll('.sr-only')][0];
    if (sr) displayText = clean(sr.textContent);
    if (!displayText) {
      const next = h1.nextElementSibling;
      if (next) displayText = animatedText(next);
    }
  }
  if (displayText) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = displayText;
    p.append(strong);
    content.push(p);
  }

  // Description: rich-text paragraph(s) after the title block, outside the promo strip
  const descParas = [...element.querySelectorAll('.rich-text-content p')]
    .filter((p) => !p.closest('a') && clean(p.textContent));
  descParas.forEach((p) => content.push(p));

  // Buy box: product name, price, CTA
  const allParas = [...element.querySelectorAll('p')]
    .filter((p) => !p.closest('a') && !p.closest('.rich-text-content') && !p.closest('.st-line'));
  const priceP = allParas.find((p) => PRICE.test(p.textContent) && clean(p.textContent).length < 30);
  if (priceP) {
    const nameP = allParas.find((p) => p !== priceP
      && (p.compareDocumentPosition(priceP) & 4)
      && clean(p.textContent)
      && clean(p.textContent).length < 60
      && !p.querySelector('.sr-only')
      && !p.matches('[class*="hero-"]'));
    if (nameP) {
      const n = document.createElement('p');
      n.textContent = clean(nameP.textContent);
      content.push(n);
    }
    const pr = document.createElement('p');
    pr.textContent = clean(priceP.textContent);
    content.push(pr);
  }
  const cta = [...element.querySelectorAll('a[href]')].reverse()
    .find((a) => a !== promoAnchor && !a.closest('sup') && clean(a.textContent)
      && !a.querySelector('p, .rich-text-content'));
  if (cta) content.push(linkPara(cta.getAttribute('href'), clean(cta.textContent), document));

  if (!content.length && !mediaCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }
  if (content.length) cells.push([content]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-product', cells });
  element.replaceWith(block);
}
