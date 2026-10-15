/*
 * Columns (security)
 * Image-topped feature columns: image, then H3 + paragraph.
 * Preferred authoring: one row, one cell per column (image, H3, paragraph in the cell).
 * Also accepted: one row per column with an image cell next to a text cell.
 */

import { createOptimizedPicture } from '../../scripts/images.js';

function isImageOnly(cell) {
  return Boolean(cell.querySelector('picture, img')) && !cell.textContent.trim();
}

/**
 * Groups authored cells into columns.
 * @param {Element} block The block
 * @returns {Element[][]} Cells per column
 */
function toColumns(block) {
  const columns = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children]
      .filter((cell) => cell.textContent.trim() || cell.querySelector('picture, img'));
    if (!cells.length) return;
    // a row holding an image-only cell describes a single column
    if (cells.length > 1 && cells.some(isImageOnly)) columns.push(cells);
    else cells.forEach((cell) => columns.push([cell]));
  });
  return columns;
}

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'columns-security-list';

  toColumns(block).forEach((cells) => {
    const item = document.createElement('li');
    item.className = 'columns-security-item';
    const media = document.createElement('div');
    media.className = 'columns-security-media';
    const body = document.createElement('div');
    body.className = 'columns-security-body';

    cells.forEach((cell) => body.append(...cell.childNodes));
    const picture = body.querySelector('picture') || body.querySelector('img');
    if (picture) {
      const img = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
      const holder = picture.closest('p');
      media.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
      picture.remove();
      if (holder && !holder.textContent.trim() && !holder.children.length) holder.remove();
      item.append(media);
    } else {
      item.classList.add('no-media');
    }
    item.append(body);
    list.append(item);
  });

  block.replaceChildren(list);
}
