/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="Surface Laptop Pro FAQs"] .inview-root.contents
 *
 * Output (blocks/accordion-faq/README.md): one row per item: question | answer rich text.
 *
 * Source structure (validated): div#…-accordion > div x21 > h2 > button > span (question).
 * Answer panels (div[role="region"]) are only rendered when an item is opened, so answers
 * are taken from, in order:
 *   1. a rendered panel in the DOM (h2 + following [role="region"]),
 *   2. the Next.js flight data: { data-componentname: "WrapperFaq", items: [{ title, content (RSC) }] },
 *   3. the page's schema.org FAQPage JSON-LD (acceptedAnswer.text HTML).
 * Iteration keys on the h2 question headings (not the nested buttons).
 */

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

let pageHtmlCache = null;
function fetchPageHtml(document) {
  if (pageHtmlCache !== null) return pageHtmlCache;
  pageHtmlCache = '';
  const win = (document && document.defaultView) || (typeof window !== 'undefined' ? window : null);
  if (!win || typeof win.XMLHttpRequest === 'undefined') return pageHtmlCache;
  try {
    const href = (win.location && /^https?:/.test(win.location.href)) ? win.location.href : document.URL;
    if (/^https?:/.test(href || '')) {
      const xhr = new win.XMLHttpRequest();
      xhr.open('GET', href, false);
      xhr.send();
      if (xhr.status >= 200 && xhr.status < 300) pageHtmlCache = xhr.responseText || '';
    }
  } catch (e) { /* offline / blocked */ }
  return pageHtmlCache;
}

function getFlightRows(document) {
  const win = (document && document.defaultView) || (typeof window !== 'undefined' ? window : null);
  if (win && win.__msFlightRows) return win.__msFlightRows;
  const chunks = [];
  [...document.querySelectorAll('script')].forEach((s) => {
    const t = s.textContent || '';
    if (t.includes('self.__next_f.push')) flightChunksFrom(`${t}</script>`, chunks);
  });
  if (!chunks.length) flightChunksFrom(fetchPageHtml(document), chunks);
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

function norm(text) {
  return clean(text).toLowerCase().replace(/[’']/g, "'");
}

/** Footnote refs normalised, span wrappers in links dropped, empty p/br removed. */
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
  root.querySelectorAll('a span').forEach((span) => span.replaceWith(...span.childNodes));
  root.querySelectorAll('br').forEach((br) => {
    if (!br.parentElement || !br.parentElement.closest('p, li')) br.remove();
  });
  root.querySelectorAll('p').forEach((p) => { if (!clean(p.textContent) && !p.querySelector('img')) p.remove(); });
  return root;
}

function blockChildren(wrap) {
  const out = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1 && child.tagName === 'DIV') walk(child);
      else if (child.nodeType === 1) out.push(child);
      else if (clean(child.textContent)) {
        const p = child.ownerDocument.createElement('p');
        p.textContent = clean(child.textContent);
        out.push(p);
      }
    });
  };
  walk(wrap);
  return out;
}

function answersFromFlight(document) {
  const map = new Map();
  const rows = getFlightRows(document);
  if (!Object.keys(rows).length) return map;
  const holder = findInAllRows(rows, (o) => {
    const items = resolveRef(o.items, rows);
    return Array.isArray(items) && items.length > 1
      && items.every((it) => { const r = resolveRef(it, rows); return r && 'title' in r && 'content' in r; })
      && items.some((it) => 'schemaText' in resolveRef(it, rows));
  });
  if (!holder) return map;
  resolveRef(holder.items, rows).forEach((raw) => {
    const item = resolveRef(raw, rows);
    const q = clean(resolveRef(item.title, rows));
    const wrap = document.createElement('div');
    wrap.append(...rscToNodes(item.content, rows, document));
    if (!clean(wrap.textContent) && typeof item.schemaText === 'string') wrap.innerHTML = item.schemaText;
    // Optional CTA on an item
    const cta = resolveRef(item.cta, rows);
    if (cta && typeof cta === 'object' && (cta.href || cta.url) && (cta.text || cta.label)) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = cta.href || cta.url;
      a.textContent = clean(cta.text || cta.label);
      p.append(a);
      wrap.append(p);
    }
    tidyRichText(wrap, document);
    if (q) map.set(norm(q), { question: q, answer: blockChildren(wrap) });
  });
  return map;
}

function answersFromJsonLd(document) {
  const map = new Map();
  const texts = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent);
  if (!texts.some((t) => t.includes('FAQPage'))) {
    const html = fetchPageHtml(document);
    const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
    let m = re.exec(html);
    while (m) { texts.push(m[1]); m = re.exec(html); }
  }
  texts.forEach((t) => {
    if (!t.includes('FAQPage')) return;
    let data;
    try { data = JSON.parse(t); } catch (e) { return; }
    (Array.isArray(data) ? data : [data]).forEach((d) => {
      if (!d || d['@type'] !== 'FAQPage' || !Array.isArray(d.mainEntity)) return;
      d.mainEntity.forEach((q) => {
        const question = clean(q.name);
        const html = q.acceptedAnswer?.text || '';
        const wrap = document.createElement('div');
        wrap.innerHTML = /<[a-z]/i.test(html) ? html : `<p>${html}</p>`;
        tidyRichText(wrap, document);
        if (question) map.set(norm(question), { question, answer: blockChildren(wrap) });
      });
    });
  });
  return map;
}

export default function parse(element, { document }) {
  const headings = [...element.querySelectorAll('h2, h3')].filter((h) => clean(h.textContent));
  let flight = null;
  let jsonLd = null;

  const cells = [];
  const used = new Set();
  headings.forEach((h) => {
    const question = clean(h.textContent);
    const key = norm(question);
    if (used.has(key)) return;
    used.add(key);
    let answer = [];

    // 1) rendered panel
    const item = h.parentElement;
    const region = item && item.querySelector('[role="region"]');
    if (region && clean(region.textContent)) {
      const wrap = document.createElement('div');
      wrap.append(...region.cloneNode(true).childNodes);
      tidyRichText(wrap, document);
      answer = blockChildren(wrap);
    }
    // 2) flight data
    if (!answer.length) {
      if (!flight) flight = answersFromFlight(document);
      answer = flight.get(key)?.answer || [];
    }
    // 3) JSON-LD
    if (!answer.length) {
      if (!jsonLd) jsonLd = answersFromJsonLd(document);
      answer = jsonLd.get(key)?.answer || [];
    }
    cells.push([question, answer.length ? answer : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
