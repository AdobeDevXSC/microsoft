/*
 * Cards (content)
 * Grid of Microsoft Store content cards. One row per card: image cell | text cell
 * (heading, text, optional link). Either cell may be missing.
 * Variants: (default) two large image cards, flat; `benefits` four elevated icon cards.
 */
import { createOptimizedPicture } from '../../scripts/images.js';

export default function decorate(block) {
  const benefits = block.classList.contains('benefits');
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((c) => c.textContent.trim() || c.querySelector('picture, img'));
    if (!cells.length) return;
    const item = document.createElement('li');
    cells.forEach((cell) => {
      const isImage = cell.querySelector('picture, img') && !cell.textContent.trim();
      cell.className = isImage ? 'cards-content-image' : 'cards-content-body';
      if (isImage) {
        const img = cell.querySelector('img');
        cell.replaceChildren(createOptimizedPicture(img.src, img.alt, false, [{ width: benefits ? '420' : '960' }]));
      } else {
        cell.querySelectorAll('a:any-link').forEach((a) => {
          const p = a.closest('p');
          if (p && p.textContent.trim() === a.textContent.trim() && !a.classList.contains('button')) {
            a.classList.add('store-cta');
            p.classList.add('cards-content-link');
          }
        });
      }
      item.append(cell);
    });
    list.append(item);
  });
  block.replaceChildren(list);
}
