/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-features. Base: columns.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="PARA WITH COLUMNS"]
 *
 * Output (blocks/columns-features/README.md): one row, one cell per column:
 *   H3 title + paragraph (with <sup><a href="#footnote-N"> references).
 *
 * Source structure (validated): section > div > ul[role="list"] > li x3;
 *   li > div > p (title) + div > div.rich-text-content > p (body, may hold sup#ref-N > a[href="#footnote-N"]).
 * Iteration keys on the <li> wrappers.
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Normalises footnote refs to <sup><a href="#footnote-N">N</a></sup> ('*' -> footnote-star). */
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
  let items = [...element.querySelectorAll('ul > li')];
  if (!items.length) items = [...element.querySelectorAll(':scope > section > div > div, :scope > div > div')];

  const columns = [];
  items.forEach((item) => {
    const titleEl = item.querySelector('h2, h3, h4')
      || [...item.querySelectorAll('p')].find((p) => !p.closest('.rich-text-content'));
    const bodyParas = [...item.querySelectorAll('.rich-text-content p')];
    if (!bodyParas.length) {
      item.querySelectorAll('p').forEach((p) => { if (p !== titleEl) bodyParas.push(p); });
    }
    const cell = [];
    if (titleEl && clean(titleEl.textContent)) {
      const h3 = document.createElement('h3');
      h3.textContent = clean(titleEl.textContent);
      cell.push(h3);
    }
    bodyParas.filter((p) => clean(p.textContent)).forEach((p) => cell.push(normalizeSups(p, document)));
    if (cell.length) columns.push(cell);
  });

  if (!columns.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [columns];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-features', cells });
  element.replaceWith(block);
}
