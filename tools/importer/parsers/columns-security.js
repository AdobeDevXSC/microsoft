/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-security. Base: columns.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="Surface Pro Ultra - Security That Means Business - Generic Columns"]
 *
 * Output (blocks/columns-security/README.md): one row, one cell per column:
 *   image + H3 + paragraph.
 *
 * Source structure (validated): div > div > div > [column] x3; each column holds
 *   figure > img, div > h3, div > div > .rich-text-content > p.
 * Columns are found as the parent of each h3's wrapper (falls back to each figure's parent).
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function normalizeSups(root, document) {
  root.querySelectorAll('sup').forEach((sup) => {
    const a = sup.querySelector('a[href*="#footnote-"]');
    if (!a) return;
    const href = a.getAttribute('href');
    let frag = decodeURIComponent(href.slice(href.indexOf('#footnote-') + 10));
    if (frag === '*') frag = 'star';
    const link = document.createElement('a');
    link.href = `#footnote-${frag}`;
    link.textContent = clean(a.textContent) || (frag === 'star' ? '*' : frag);
    const out = document.createElement('sup');
    out.append(link);
    sup.replaceWith(out);
  });
  return root;
}

export default function parse(element, { document }) {
  // Each column is the nearest ancestor of a heading that also holds the column's image/text.
  const headings = [...element.querySelectorAll('h2, h3, h4')];
  let columnsEls = headings.map((h) => {
    let col = h.parentElement;
    while (col && col !== element && !col.querySelector('figure, img, p')) col = col.parentElement;
    if (col && col !== element && col.querySelectorAll('h2, h3, h4').length > 1) col = h.parentElement;
    return col;
  }).filter((c, i, arr) => c && c !== element && arr.indexOf(c) === i);
  if (!columnsEls.length) {
    columnsEls = [...element.querySelectorAll('figure')].map((f) => f.parentElement)
      .filter((c, i, arr) => c && arr.indexOf(c) === i);
  }

  const columns = [];
  columnsEls.forEach((col) => {
    const cell = [];
    const img = col.querySelector('img:not([src^="data:"])');
    if (img) {
      const out = document.createElement('img');
      out.src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      out.alt = alt === 'Image' ? '' : alt;
      cell.push(out);
    }
    const h = col.querySelector('h2, h3, h4');
    if (h && clean(h.textContent)) {
      const h3 = document.createElement('h3');
      h3.textContent = clean(h.textContent);
      cell.push(h3);
    }
    [...col.querySelectorAll('p')].filter((p) => clean(p.textContent))
      .forEach((p) => cell.push(normalizeSups(p, document)));
    if (cell.length) columns.push(cell);
  });

  if (!columns.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [columns];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-security', cells });
  element.replaceWith(block);
}
