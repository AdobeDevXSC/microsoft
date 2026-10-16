/* eslint-disable */
/* global WebImporter */
/**
 * Parser for footnotes. Base: footnotes (custom).
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: #r-page-footnotes
 *
 * Output (blocks/footnotes/README.md): one row per footnote: marker (*, 1..32) | rich text.
 * The block assigns id="footnote-star" / id="footnote-N" from the marker.
 *
 * Source structure (validated):
 *   section > div > div > [.rich-text-content > p "Screens simulated..."] (default content, kept
 *   before the block) + ol > li x33; li > a#footnote-N[href="#ref-N"] "[N]" + span > div > p (text).
 * Iteration keys on the <li> items (the marker anchors are only read, never iterated).
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function tidy(root, document) {
  root.querySelectorAll('a span').forEach((span) => span.replaceWith(...span.childNodes));
  // <strong>Title<br></strong>Text -> <strong>Title</strong><br>Text (markdown drops a br inside strong)
  root.querySelectorAll('strong > br:last-child, b > br:last-child, em > br:last-child').forEach((br) => {
    br.parentElement.after(br);
  });
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
  root.querySelectorAll('p').forEach((p) => { if (!clean(p.textContent)) p.remove(); });
  return root;
}

function markerOf(li) {
  const a = li.querySelector('a[id^="footnote-"]') || li.querySelector('a[href^="#ref-"]') || li.querySelector('a');
  let marker = '';
  if (a) {
    const id = a.getAttribute('id') || '';
    if (id.startsWith('footnote-')) marker = decodeURIComponent(id.slice(9));
    if (!marker) marker = clean(a.textContent).replace(/^\[|\]$/g, '');
  }
  if (marker === 'star') marker = '*';
  return { marker, anchor: a };
}

export default function parse(element, { document }) {
  const list = element.querySelector('ol, ul');
  const items = list ? [...list.querySelectorAll(':scope > li')] : [];

  // Default content above the block: disclaimer paragraphs outside the list
  const intro = [...element.querySelectorAll('p')].filter((p) => !p.closest('li') && clean(p.textContent));

  const cells = [];
  items.forEach((li) => {
    const { marker, anchor } = markerOf(li);
    const content = li.cloneNode(true);
    if (anchor) {
      const id = anchor.getAttribute('id');
      const copy = id ? content.querySelector(`a[id="${id}"]`) : content.querySelector('a');
      if (copy) copy.remove();
    }
    tidy(content, document);
    const blocks = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 1 && (child.tagName === 'DIV' || child.tagName === 'SPAN') && child.querySelector('p, ul, ol')) walk(child);
        else if (child.nodeType === 1 && /^(P|UL|OL)$/.test(child.tagName)) blocks.push(child);
        else if (clean(child.textContent)) {
          const p = document.createElement('p');
          p.append(child.cloneNode(true));
          blocks.push(p);
        }
      });
    };
    walk(content);
    if (!marker && !blocks.length) return;
    cells.push([marker, blocks.length ? blocks : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'footnotes', cells });
  element.replaceWith(block);
  if (intro.length) block.before(...intro.map((p) => tidy(p, document)));
}
