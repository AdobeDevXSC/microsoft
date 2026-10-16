/*
 * Cards (product)
 * Cross-sell product cards: name, tagline and links on top, product cut-out image below.
 * One row per product: image cell | text cell (H3 name, tagline, Learn more + Buy/Pre-order links).
 * Cell order does not matter; a card may omit the image or the links.
 * Used in a shared fragment reused across Surface pages, so nothing here is page-specific.
 */

import { createOptimizedPicture } from '../../scripts/images.js';

function isImageOnly(cell) {
  return Boolean(cell.querySelector('picture, img')) && !cell.textContent.trim();
}

/**
 * Moves the card's links into one links row (whether authored together or one per paragraph).
 * @param {Element} body Card body
 */
function buildLinks(body) {
  const links = [...body.querySelectorAll('a')].filter((a) => !a.closest('h1, h2, h3, h4, h5, h6'));
  if (!links.length) return;
  const row = document.createElement('p');
  row.className = 'cards-product-links';
  links.forEach((a, i) => {
    const holder = a.closest('p, li');
    a.classList.remove('button', 'accent', 'primary', 'secondary');
    a.classList.add('cards-product-link', i === 0 ? 'cards-product-link-primary' : 'cards-product-link-secondary');
    row.append(a);
    if (holder && holder !== row && !holder.textContent.trim() && !holder.querySelector('picture, img')) {
      const list = holder.closest('ul, ol');
      holder.remove();
      if (list && !list.children.length) list.remove();
    }
  });
  body.append(row);
}

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'cards-product-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children]
      .filter((cell) => cell.textContent.trim() || cell.querySelector('picture, img'));
    if (!cells.length) return;
    const card = document.createElement('li');
    card.className = 'cards-product-card';

    const body = document.createElement('div');
    body.className = 'cards-product-body';
    const media = document.createElement('div');
    media.className = 'cards-product-media';

    cells.forEach((cell) => {
      if (isImageOnly(cell)) media.append(...cell.childNodes);
      else body.append(...cell.childNodes);
    });
    // an image authored inside the text cell still goes to the media slot
    body.querySelectorAll('picture, img').forEach((pic) => {
      if (pic.tagName === 'IMG' && pic.closest('picture')) return;
      const holder = pic.closest('p');
      media.append(pic);
      if (holder && !holder.textContent.trim() && !holder.children.length) holder.remove();
    });

    body.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('cards-product-title');
    buildLinks(body);
    card.append(body);

    const img = media.querySelector('img');
    if (img) {
      media.replaceChildren(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
      card.append(media);
    } else {
      card.classList.add('no-media');
    }
    list.append(card);
  });

  block.replaceChildren(list);
}
