/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-specs. Base: table.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="techspecs"]
 *
 * Output (blocks/table-specs/README.md): 2 columns per row:
 *   category label | values (paragraphs, <sup><a href="#footnote-N"> refs, links)
 *
 * Source structure (validated):
 *   [id="techspecs"] > div > div#specs > section > div > h3 "See full Surface Laptop Ultra specs"
 *     + button "Get details" (opens a dialog that is NOT in the DOM until clicked).
 *   The spec sheet lives only in the Next.js flight data (self.__next_f.push scripts):
 *     { specsDialog: { heading, description (RSC), items: [{ label, content (RSC) }] } }
 *
 * Replacement emitted in place of the element:
 *   h3 (kept default content)
 *   p > a[href="/modals/surface-laptop-ultra/specs"] "Get details"   (replaces the dialog button)
 *   h2 dialog heading + intro p + table-specs block, each marked
 *     data-modal="/modals/surface-laptop-ultra/specs" so the import script can move them
 *     into the modal document.
 * A rendered dialog ([role="dialog"]) in the DOM is used as a fallback when flight data is missing.
 */

const MODAL_PATH = '/modals/surface-laptop-ultra/specs';

// --- Next.js RSC flight-data helpers ---
const FLIGHT_PUSH = /self\.__next_f\.push\((\[[\s\S]*?\])\)\s*;?\s*(?:<\/script>|$)/g;

function flightChunksFrom(text, out) {
  FLIGHT_PUSH.lastIndex = 0;
  let m = FLIGHT_PUSH.exec(text);
  while (m) {
    try {
      const arr = JSON.parse(m[1]);
      if (arr[0] === 1 && typeof arr[1] === 'string') out.push(arr[1]);
    } catch (e) { /* not a data chunk */ }
    m = FLIGHT_PUSH.exec(text);
  }
}

function parseFlightRows(flight) {
  const rows = {};
  flight.split('\n').forEach((line) => {
    const m = /^([0-9a-f]+):(.*)$/s.exec(line);
    if (!m || !/^[[{"]/.test(m[2])) return;
    try { rows[m[1]] = JSON.parse(m[2]); } catch (e) { /* skip */ }
  });
  return rows;
}

function getFlightRows(document) {
  const win = (document && document.defaultView) || (typeof window !== 'undefined' ? window : null);
  if (win && win.__msFlightRows) return win.__msFlightRows;
  const chunks = [];
  [...document.querySelectorAll('script')].forEach((s) => {
    const t = s.textContent || '';
    if (t.includes('self.__next_f.push')) flightChunksFrom(`${t}</script>`, chunks);
  });
  if (!chunks.length && win && typeof win.XMLHttpRequest !== 'undefined') {
    try {
      const href = (win.location && /^https?:/.test(win.location.href)) ? win.location.href : document.URL;
      if (/^https?:/.test(href || '')) {
        const xhr = new win.XMLHttpRequest();
        xhr.open('GET', href, false);
        xhr.send();
        if (xhr.status >= 200 && xhr.status < 300) flightChunksFrom(xhr.responseText || '', chunks);
      }
    } catch (e) { /* offline / blocked: DOM-only extraction */ }
  }
  const rows = chunks.length ? parseFlightRows(chunks.join('')) : {};
  if (win && chunks.length) win.__msFlightRows = rows;
  return rows;
}

function resolveRef(value, rows, depth = 0) {
  if (typeof value !== 'string' || value[0] !== '$' || depth > 20) return value;
  if (value === '$undefined') return undefined;
  if (value.startsWith('$$')) return value.slice(1);
  const m = /^\$[L@]?([0-9a-f]+)$/.exec(value);
  if (m && Object.prototype.hasOwnProperty.call(rows, m[1])) return resolveRef(rows[m[1]], rows, depth + 1);
  if (/^\$[A-Za-z]/.test(value)) return undefined;
  return value;
}

function findInFlight(value, rows, test, seen = new Set()) {
  const v = resolveRef(value, rows);
  if (!v || typeof v !== 'object' || seen.has(v)) return null;
  seen.add(v);
  if (!Array.isArray(v) && test(v)) return v;
  const kids = Array.isArray(v) ? v : Object.values(v);
  for (let i = 0; i < kids.length; i += 1) {
    const found = findInFlight(kids[i], rows, test, seen);
    if (found) return found;
  }
  return null;
}

function findInAllRows(rows, test) {
  const ids = Object.keys(rows);
  for (let i = 0; i < ids.length; i += 1) {
    const found = findInFlight(rows[ids[i]], rows, test);
    if (found) return found;
  }
  return null;
}

const RSC_ATTRS = ['href', 'src', 'alt', 'title'];

function rscToNodes(value, rows, document, depth = 0) {
  const v = resolveRef(value, rows);
  if (v === null || v === undefined || typeof v === 'boolean' || depth > 60) return [];
  if (typeof v === 'string' || typeof v === 'number') return [document.createTextNode(String(v))];
  if (!Array.isArray(v)) return [];
  if (v[0] === '$' && v.length === 4 && typeof v[1] === 'string') {
    const type = v[1];
    const props = v[3] || {};
    const children = rscToNodes(props.children, rows, document, depth + 1);
    if (/^[a-z][a-z0-9]*$/.test(type)) {
      const el = document.createElement(type);
      RSC_ATTRS.forEach((a) => {
        const val = resolveRef(props[a], rows);
        if (typeof val === 'string' || typeof val === 'number') el.setAttribute(a, String(val));
      });
      el.append(...children);
      return [el];
    }
    return children;
  }
  return v.flatMap((item) => rscToNodes(item, rows, document, depth + 1));
}
// --- end flight helpers ---

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Footnote refs -> <sup><a href="#footnote-N">N</a></sup>; empty sups and span wrappers dropped. */
function tidyRichText(root, document) {
  root.querySelectorAll('sup').forEach((sup) => {
    const a = sup.querySelector('a[href*="#footnote-"]');
    if (!a) {
      if (!clean(sup.textContent)) sup.remove();
      return;
    }
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
  root.querySelectorAll('a span, strong span').forEach((span) => span.replaceWith(...span.childNodes));
  root.querySelectorAll(':scope > br, div > br:first-child, div > br:last-child').forEach((br) => br.remove());
  root.querySelectorAll('p').forEach((p) => { if (!clean(p.textContent) && !p.querySelector('img')) p.remove(); });
  return root;
}

/** Block-level children of a rich-text fragment (unwrapping .rich-text-content divs). */
function blockChildren(wrap) {
  const out = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1 && child.tagName === 'DIV') walk(child);
      else if (child.nodeType === 1 && child.tagName === 'BR') { /* skip */ }
      else if (child.nodeType === 1 || clean(child.textContent)) out.push(child);
    });
  };
  walk(wrap);
  return out;
}

function markModal(el) {
  el.setAttribute('data-modal', MODAL_PATH);
  return el;
}

export default function parse(element, { document }) {
  const out = [];

  // Kept default content: the "See full ... specs" heading
  const heading = element.querySelector('h2, h3');
  if (heading && clean(heading.textContent)) {
    const h = document.createElement(heading.tagName.toLowerCase());
    h.textContent = clean(heading.textContent);
    out.push(h);
  }

  // "Get details" dialog button -> link to the modal document
  const trigger = [...element.querySelectorAll('button, a')].find((b) => /get details|specs/i.test(clean(b.textContent)));
  const linkP = document.createElement('p');
  const link = document.createElement('a');
  link.href = MODAL_PATH;
  link.textContent = clean(trigger?.textContent) || 'Get details';
  linkP.append(link);
  out.push(linkP);

  // Spec sheet: flight data first
  let dialogHeading = '';
  let introNodes = [];
  const cells = [];
  const rows = getFlightRows(document);
  const holder = Object.keys(rows).length
    ? findInAllRows(rows, (o) => {
      const d = resolveRef(o.specsDialog, rows);
      return d && Array.isArray(resolveRef(d.items, rows));
    })
    : null;
  if (holder) {
    const dialog = resolveRef(holder.specsDialog, rows);
    dialogHeading = clean(resolveRef(dialog.heading, rows));
    const intro = document.createElement('div');
    intro.append(...rscToNodes(dialog.description, rows, document));
    tidyRichText(intro, document);
    introNodes = blockChildren(intro);
    resolveRef(dialog.items, rows).forEach((raw) => {
      const item = resolveRef(raw, rows);
      const label = clean(resolveRef(item?.label, rows));
      const wrap = document.createElement('div');
      wrap.append(...rscToNodes(item?.content, rows, document));
      tidyRichText(wrap, document);
      const values = blockChildren(wrap);
      if (!label && !values.length) return;
      cells.push([label, values.length ? values : '']);
    });
  }

  // Fallback: an opened dialog in the DOM (label/value pairs as headings + following content)
  if (!cells.length) {
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      const h = dialog.querySelector('h2');
      dialogHeading = clean(h?.textContent);
      dialog.querySelectorAll('h3, h4, dt, th').forEach((labelEl) => {
        const values = [];
        let sib = labelEl.nextElementSibling;
        while (sib && !sib.matches('h3, h4, dt, th')) {
          values.push(sib);
          sib = sib.nextElementSibling;
        }
        if (!values.length && labelEl.parentElement) {
          [...labelEl.parentElement.querySelectorAll('p, ul, ol, dd, td')].forEach((v) => values.push(v));
        }
        const wrap = document.createElement('div');
        wrap.append(...values);
        tidyRichText(wrap, document);
        const label = clean(labelEl.textContent);
        if (label) cells.push([label, wrap.childNodes.length ? [...wrap.childNodes] : '']);
      });
    }
  }

  if (cells.length) {
    if (dialogHeading) {
      const h2 = document.createElement('h2');
      h2.textContent = dialogHeading;
      out.push(markModal(h2));
    }
    introNodes.forEach((n) => {
      if (n.nodeType === 1) out.push(markModal(n));
      else {
        const p = document.createElement('p');
        p.textContent = clean(n.textContent);
        out.push(markModal(p));
      }
    });
  }

  if (!cells.length) {
    // No spec data available: keep heading + modal link only.
    element.replaceWith(...out);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-specs', cells });
  markModal(block);
  out.push(block);
  element.replaceWith(block);
  block.before(...out.slice(0, -1));
}
