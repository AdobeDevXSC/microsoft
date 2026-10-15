/*
 * Hero Product
 * Full-bleed poster/video hero with a promo strip, headline and a price + CTA box.
 * Rows (any may be omitted):
 *   media   - poster image + desktop MP4 link (+ mobile MP4 link)
 *   promo   - a single link
 *   content - H1, display line, description, product name, price, CTA
 */

import { buildVideo, isVideoLink } from '../../scripts/video.js';

const PRICE = /[$€£¥]\s?\d[\d.,]*|\d[\d.,]*\s?[$€£¥]/;

function isMediaCell(cell) {
  return !cell.querySelector('h1, h2, h3, h4, h5, h6')
    && (cell.querySelector('picture, img') || [...cell.querySelectorAll('a')].some(isVideoLink));
}

function isPromoCell(cell) {
  const links = [...cell.querySelectorAll('a')].filter((a) => !isVideoLink(a));
  return !cell.querySelector('h1, h2, h3, h4, h5, h6, picture, img') && links.length === 1;
}

/**
 * Pulls product name, price and CTA paragraphs out of the content into a buy box.
 * @param {Element} content Content cell
 * @returns {Element|null} The buy box
 */
function buildBuyBox(content) {
  const paragraphs = [...content.querySelectorAll(':scope > p')];
  // footnote links (<sup><a>) do not count as links here
  const hasLink = (p) => [...p.querySelectorAll('a')].some((a) => !a.closest('sup'));
  const isLinkOnly = (p) => {
    const a = p.querySelector('a');
    return a && !a.closest('sup') && p.textContent.trim() === a.textContent.trim();
  };
  const priceIndex = paragraphs.findIndex((p) => !hasLink(p) && PRICE.test(p.textContent));
  const price = paragraphs[priceIndex];
  // the CTA is the last link-only paragraph, and must come after the price when there is one
  const ctaIndex = paragraphs.findLastIndex(isLinkOnly);
  const cta = ctaIndex > priceIndex ? paragraphs[ctaIndex] : null;
  if (!price && !cta) return null;

  const box = document.createElement('div');
  box.className = 'hero-product-buy';
  if (price) {
    const name = paragraphs[priceIndex - 1];
    if (name && name === price.previousElementSibling && !hasLink(name)
      && name.textContent.trim().length < 60) {
      name.classList.add('hero-product-name');
      box.append(name);
    }
    price.classList.add('hero-product-price');
    box.append(price);
  }
  if (cta) {
    cta.classList.add('hero-product-cta');
    box.append(cta);
  }
  return box;
}

export default function decorate(block) {
  const cells = [...block.children].map((row) => row.firstElementChild).filter(Boolean);
  const media = cells.find(isMediaCell);
  const promo = cells.find((cell) => cell !== media && isPromoCell(cell));
  const content = cells.find((cell) => cell !== media && cell !== promo)
    || document.createElement('div');

  // keep the poster as the LCP candidate
  const img = media?.querySelector('img');
  if (img) {
    img.loading = 'eager';
    img.fetchPriority = 'high';
  }

  const parts = [];
  if (media) {
    media.className = 'hero-product-media';
    const video = buildVideo(media, { loop: true, autoplay: true, controls: true });
    if (!video) {
      const picture = media.querySelector('picture, img');
      const wrapper = document.createElement('div');
      wrapper.className = 'video-media';
      wrapper.append(picture);
      media.replaceChildren(wrapper);
    }
    parts.push(media);
  } else {
    block.classList.add('no-media');
  }

  if (promo) {
    promo.className = 'hero-product-promo';
    promo.querySelectorAll('a').forEach((a) => a.classList.remove('button', 'primary', 'secondary', 'accent'));
    promo.querySelectorAll('.button-wrapper').forEach((p) => p.classList.remove('button-wrapper'));
    parts.push(promo);
  }

  content.className = 'hero-product-content';
  const text = document.createElement('div');
  text.className = 'hero-product-text';
  const box = buildBuyBox(content);
  const h1 = content.querySelector('h1');
  // the line after the H1 is the large display line
  const display = h1?.nextElementSibling;
  if (display && display.tagName !== 'H1' && !display.matches('.button-wrapper')) display.classList.add('hero-product-display');
  text.append(...content.childNodes);
  content.append(text);
  if (box) content.append(box);
  parts.push(content);

  block.replaceChildren(...parts);
}
