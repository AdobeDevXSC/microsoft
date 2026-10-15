/* eslint-disable */
/* global WebImporter */
/**
 * Parser for buy-bar. Base: buy-bar (custom).
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: #primaryArea > div:nth-of-type(5)
 *
 * Output (blocks/buy-bar/README.md): single row: product name | price | Pre-order link.
 *
 * Source structure (validated): div > div > [span "Surface Laptop Ultra", span "$2,599.99"] + a "Pre-order".
 */

const PRICE = /[$€£¥]\s?\d[\d.,]*|\d[\d.,]*\s?[$€£¥]/;

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const ctaSrc = element.querySelector('a[href]');
  // Leaf text nodes holders (span/p/strong) outside the CTA
  const texts = [...element.querySelectorAll('span, p, strong, h2, h3, h4')]
    .filter((el) => !el.closest('a') && !el.querySelector('span, p, strong, h2, h3, h4'))
    .map((el) => clean(el.textContent))
    .filter(Boolean);

  const price = texts.find((t) => PRICE.test(t)) || '';
  const name = texts.find((t) => t !== price) || '';

  if (!name && !price && !ctaSrc) {
    element.replaceWith(...element.childNodes);
    return;
  }

  let cta = '';
  if (ctaSrc) {
    cta = document.createElement('a');
    cta.href = ctaSrc.getAttribute('href');
    cta.textContent = clean(ctaSrc.textContent);
  }

  const cells = [[name, price, cta]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'buy-bar', cells });
  element.replaceWith(block);
}
