/* eslint-disable */
/* global WebImporter */
/**
 * Parser for scrolling-slides-story. Base: scrolling-slides (custom).
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selector: [id="PANEL 6: RUN LOCAL. RUN FREE"]
 *
 * Output (blocks/scrolling-slides-story/README.md): one row per story:
 *   cell1 = desktop MP4 link + mobile MP4 link | cell2 = H2 + paragraph
 *
 * Source structure (validated):
 *   3 x video > source[media="(min-width: 1024px)"] (desktop) + source[media^="not"] (mobile)
 *   3 x h2 > button > span (BUILD. / CREATE. / ANALYZE.) — accordion; only the OPEN item's
 *   div[role="region"] > .rich-text-content > p is rendered (BUILD.). CREATE./ANALYZE. text
 *   exists only in the Next.js flight data:
 *     { title, content (RSC rich text), backgroundMedia (mobile), backgroundMediaDesktop }
 * Flight data is used when available (complete); otherwise the DOM is read, pairing
 * video i with h2 i. Iteration keys on <video>/<h2>, never on the nested <button>s.
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
  if (test(v)) return v;
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

const RSC_ATTRS = ['href', 'id', 'src', 'alt', 'title'];

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

function isNotMedia(media) {
  return /not\s*\(/.test(media || '');
}

function linkPara(href, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = href;
  p.append(a);
  return p;
}

function headingFromText(text, document) {
  const h2 = document.createElement('h2');
  h2.textContent = text;
  return h2;
}

function domVideoUrls(video) {
  const sources = [...video.querySelectorAll('source[src]')]
    .map((s) => ({ src: s.getAttribute('src'), media: s.getAttribute('media') || '' }))
    .filter((s) => s.src);
  if (video.getAttribute('src')) sources.unshift({ src: video.getAttribute('src'), media: '' });
  if (!sources.length) return [];
  const desktop = sources.find((s) => !isNotMedia(s.media)) || sources[0];
  let mobile = sources.find((s) => isNotMedia(s.media) && s.src !== desktop.src);
  if (!mobile && sources.length > 1) mobile = sources[sources.length - 1];
  return [desktop.src, mobile?.src].filter((s, i, arr) => s && arr.indexOf(s) === i);
}

function mediaSrcs(media, rows) {
  const m = resolveRef(media, rows);
  const sources = m ? resolveRef(m.sources, rows) : null;
  return Array.isArray(sources) ? sources.map((s) => resolveRef(s, rows)?.src).filter(Boolean) : [];
}

function posterOf(media, rows) {
  const m = resolveRef(media, rows);
  const poster = m ? resolveRef(m.poster, rows) : null;
  return poster && poster.src ? poster : null;
}

export default function parse(element, { document }) {
  const domHeadings = [...element.querySelectorAll('h2, h3')];
  const titles = domHeadings.map((h) => clean(h.textContent)).filter(Boolean);
  const cells = [];

  // 1) Flight data: the full story list (hidden panels included)
  const rows = getFlightRows(document);
  const holder = Object.keys(rows).length ? findInAllRows(rows, (o) => Array.isArray(o)
    && o.length > 1
    && o.every((it) => it && typeof it === 'object' && !Array.isArray(it) && 'title' in it
      && ('backgroundMediaDesktop' in it || 'backgroundMedia' in it))
    && (!titles.length || titles.every((t) => o.some((it) => clean(resolveRef(it.title, rows)) === t)))) : null;

  if (holder) {
    holder.forEach((item) => {
      const title = clean(resolveRef(item.title, rows));
      const desktop = mediaSrcs(item.backgroundMediaDesktop, rows);
      const mobile = mediaSrcs(item.backgroundMedia, rows);
      const mediaCell = [];
      const poster = posterOf(item.backgroundMediaDesktop, rows) || posterOf(item.backgroundMedia, rows);
      if (poster) {
        const img = document.createElement('img');
        img.src = poster.src;
        img.alt = poster.alt || '';
        mediaCell.push(img);
      }
      [desktop[0] || mobile[0], mobile[0]]
        .filter((s, i, arr) => s && arr.indexOf(s) === i)
        .forEach((u) => mediaCell.push(linkPara(u, document)));
      const textCell = [];
      if (title) textCell.push(headingFromText(title, document));
      const wrap = document.createElement('div');
      wrap.append(...rscToNodes(item.content, rows, document));
      normalizeSups(wrap, document);
      wrap.querySelectorAll('sup:empty').forEach((s) => s.remove());
      [...wrap.querySelectorAll('p, ul, ol')].filter((n) => !n.parentElement.closest('p, ul, ol'))
        .forEach((n) => { if (clean(n.textContent)) textCell.push(n); });
      if (mediaCell.length || textCell.length) {
        cells.push([mediaCell.length ? mediaCell : '', textCell.length ? textCell : '']);
      }
    });
  }

  // 2) DOM fallback: pair video i with heading i
  if (!cells.length) {
    const videos = [...element.querySelectorAll('video')];
    const count = Math.max(videos.length, domHeadings.length);
    for (let i = 0; i < count; i += 1) {
      const mediaCell = videos[i] ? domVideoUrls(videos[i]).map((u) => linkPara(u, document)) : [];
      const textCell = [];
      const h = domHeadings[i];
      if (h) {
        textCell.push(headingFromText(clean(h.textContent), document));
        const item = h.parentElement;
        [...item.querySelectorAll('p')].filter((p) => !h.contains(p) && clean(p.textContent))
          .forEach((p) => textCell.push(normalizeSups(p, document)));
      }
      if (mediaCell.length || textCell.length) {
        cells.push([mediaCell.length ? mediaCell : '', textCell.length ? textCell : '']);
      }
    }
  }

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'scrolling-slides-story', cells });
  element.replaceWith(block);
}
