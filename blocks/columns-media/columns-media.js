/*
 * Columns (media)
 * One row, two cells: an image cell and a text cell (heading, text, optional CTA), in either
 * order - the authored order is the visual order on desktop. On mobile the image comes first.
 * Variant `dark`: black card with white text (source "feature" with material-surface dark).
 */
import { createOptimizedPicture } from '../../scripts/images.js';

export default function decorate(block) {
  const cells = [...block.children].flatMap((row) => [...row.children])
    .filter((c) => c.textContent.trim() || c.querySelector('picture, img'));
  const inner = document.createElement('div');
  inner.className = 'columns-media-inner';
  let imageFirst = false;
  cells.forEach((cell, i) => {
    const isImage = cell.querySelector('picture, img') && !cell.textContent.trim();
    if (isImage) {
      if (i === 0) imageFirst = true;
      const img = cell.querySelector('img');
      cell.replaceChildren(createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '1100' }, { width: '750' }]));
      cell.className = 'columns-media-image';
    } else {
      cell.className = 'columns-media-text';
    }
    inner.append(cell);
  });
  if (imageFirst) block.classList.add('image-first');
  block.replaceChildren(inner);
}
