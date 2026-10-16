/* eslint-disable */
/* global WebImporter */
/**
 * Parser for section-nav. Base: section-nav (custom).
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: #chapter-module > section > div:nth-of-type(2)
 *
 * Output (blocks/section-nav/README.md): one row per link, e.g. [Performance](#performance).
 *
 * Source structure (validated): div[role="group"][aria-label="Chapter navigation"] > a[href^="#"] x5
 * (Performance, Display, Local AI, Security, Tech specs). Each anchor has a distinct href, so
 * html2md's inline-sibling merge cannot fold them together.
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const group = element.querySelector('[role="group"], nav') || element;
  const seen = new Set();
  const cells = [];
  [...group.querySelectorAll('a[href]')].forEach((a) => {
    const raw = a.getAttribute('href') || '';
    const hashIdx = raw.indexOf('#');
    if (hashIdx < 0) return;
    const hash = raw.slice(hashIdx);
    if (hash.length < 2 || seen.has(hash)) return;
    const label = clean(a.getAttribute('title')) || clean(a.textContent);
    if (!label) return;
    seen.add(hash);
    const link = document.createElement('a');
    link.href = hash;
    link.textContent = label;
    cells.push([link]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'section-nav', cells });
  element.replaceWith(block);
}
