/*
 * Columns (mosaic)
 * Grey tile mosaic. One row; each cell is a column of stacked tiles:
 *   - every paragraph holding only an image becomes an image tile
 *   - consecutive other content (heading, text, link) becomes one text tile
 */
import { createOptimizedPicture } from '../../scripts/images.js';

function isImageParagraph(el) {
  return el.querySelector('picture, img') && !el.textContent.trim();
}

export default function decorate(block) {
  const cells = [...block.children].flatMap((row) => [...row.children])
    .filter((c) => c.textContent.trim() || c.querySelector('picture, img'));
  const grid = document.createElement('div');
  grid.className = 'columns-mosaic-grid';

  cells.forEach((cell) => {
    const col = document.createElement('div');
    col.className = 'columns-mosaic-col';
    let text = null;
    [...cell.children].forEach((el) => {
      if (isImageParagraph(el)) {
        text = null;
        const img = el.querySelector('img');
        const tile = document.createElement('div');
        tile.className = 'columns-mosaic-tile columns-mosaic-image';
        tile.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '940' }]));
        col.append(tile);
        return;
      }
      if (!text) {
        text = document.createElement('div');
        text.className = 'columns-mosaic-tile columns-mosaic-text';
        col.append(text);
      }
      const a = el.querySelector('a:any-link');
      if (a && el.tagName === 'P' && el.textContent.trim() === a.textContent.trim() && !a.classList.contains('button')) {
        a.classList.add('store-cta');
        el.classList.add('columns-mosaic-link');
      }
      text.append(el);
    });
    grid.append(col);
  });

  block.replaceChildren(grid);
}
