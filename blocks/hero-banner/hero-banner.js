/*
 * Hero Banner
 * Full-bleed background image with an overlay card (Microsoft Store "highlight").
 * Rows (either may be omitted, any order):
 *   media   - one picture
 *   content - optional badge (short first paragraph without links, before the heading),
 *             heading, text, CTA links
 */
import { createOptimizedPicture } from '../../scripts/images.js';

export default function decorate(block) {
  const cells = [...block.children].flatMap((row) => [...row.children]);
  const mediaCell = cells.find((c) => c.querySelector('picture, img') && !c.querySelector('h1, h2, h3, h4, h5, h6'));
  const contentCell = cells.find((c) => c !== mediaCell && c.textContent.trim());

  const media = document.createElement('div');
  media.className = 'hero-banner-media';
  const img = mediaCell?.querySelector('img');
  if (img) {
    media.append(createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]));
  }

  const content = document.createElement('div');
  content.className = 'hero-banner-content';
  if (contentCell) {
    const heading = contentCell.querySelector('h1, h2, h3, h4, h5, h6');
    const first = contentCell.firstElementChild;
    // firstElementChild !== heading means the short paragraph sits above the heading
    if (heading && first && first !== heading && first.tagName === 'P'
      && !first.querySelector('a') && first.textContent.trim().length <= 24) {
      const badge = document.createElement('span');
      badge.className = 'hero-banner-badge';
      badge.textContent = first.textContent.trim();
      first.replaceWith(badge);
    }
    const card = document.createElement('div');
    card.className = 'hero-banner-card';
    card.append(...contentCell.childNodes);
    content.append(card);
  }

  block.replaceChildren(...(img ? [media] : []), content);
}
