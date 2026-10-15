/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-product. Base: cards.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="#compare"] .grid
 *
 * Output (blocks/cards-product/README.md): one row per product:
 *   cell1 = product image | cell2 = H3 title, tagline, Learn more + Buy links
 *
 * Source structure (validated): .grid > div > article x4; article > div (h2, .rich-text-content > p,
 *   div > a "Learn more" + a "Buy"/"Pre-order") + div (empty overlay a[tabindex="-1"] + img).
 * Iteration keys on <article>; the empty overlay anchors are skipped.
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('article')];
  if (!items.length) items = [...element.querySelectorAll(':scope > div')];

  const cells = [];
  items.forEach((item) => {
    const img = item.querySelector('img:not([src^="data:"])');
    let imageCell = '';
    if (img) {
      imageCell = document.createElement('img');
      imageCell.src = img.getAttribute('src');
      imageCell.alt = img.getAttribute('alt') || '';
    }

    const text = [];
    const h = item.querySelector('h2, h3, h4');
    if (h && clean(h.textContent)) {
      const h3 = document.createElement('h3');
      h3.textContent = clean(h.textContent);
      text.push(h3);
    }
    [...item.querySelectorAll('p')].filter((p) => clean(p.textContent) && !p.closest('a'))
      .forEach((p) => {
        const out = document.createElement('p');
        out.textContent = clean(p.textContent);
        text.push(out);
      });
    const seen = new Set();
    [...item.querySelectorAll('a[href]')]
      .filter((a) => clean(a.textContent) && a.getAttribute('tabindex') !== '-1')
      .forEach((a) => {
        const key = `${a.getAttribute('href')}|${clean(a.textContent)}`;
        if (seen.has(key)) return;
        seen.add(key);
        const p = document.createElement('p');
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.textContent = clean(a.textContent);
        p.append(link);
        text.push(p);
      });

    if (!imageCell && !text.length) return;
    cells.push([imageCell, text.length ? text : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-product', cells });
  element.replaceWith(block);
}
