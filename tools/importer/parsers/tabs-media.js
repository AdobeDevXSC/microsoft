/* eslint-disable */
/* global WebImporter */
/**
 * Parser for tabs-media. Base: tabs.
 * Source: https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra
 * Instance selectors: [id="#display"] .relative.mt-10 (original markup),
 *   [id="#display"] div.relative:has([role="tab"]):has(video, img) (current markup)
 *
 * Output (blocks/tabs-media/README.md): one row per tab:
 *   cell1 = label (Morning/Afternoon/Evening) | cell2 = poster image + MP4 link(s)
 *
 * Source structure (validated):
 *   [role="tablist"] > button[role="tab"] x3  (labels)
 *   [role="tabpanel"] > div > picture + video > source[src$=".mp4"]
 * The live page only renders the SELECTED panel (Afternoon). The other panels exist only
 * in the page's Next.js flight data (self.__next_f.push scripts):
 *   { tabs: [{ value, label, content: [... { sources: [{src}], poster: {src, alt} } ...] }] }
 * The scraped cleaned.html has all three panels in the DOM, so DOM panels are used first
 * and flight data fills in any tab whose panel is not rendered.
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

/**
 * RSC flight rows of the page. Reads <script> tags when present (live DOM); otherwise
 * re-requests the page HTML synchronously (the cleanup transformer strips scripts before
 * parsers run). Cached on window.
 */
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
// --- end flight helpers ---

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isNotMedia(media) {
  return /not\s*\(/.test(media || '');
}

function makeImg(src, alt, document) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  return img;
}

function linkPara(href, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = href;
  p.append(a);
  return p;
}

function pickVideoUrls(sources) {
  if (!sources.length) return [];
  const desktop = sources.find((s) => !isNotMedia(s.media)) || sources[0];
  let mobile = sources.find((s) => isNotMedia(s.media) && s.src !== desktop.src);
  if (!mobile && sources.length > 1) mobile = sources[sources.length - 1];
  return [desktop.src, mobile?.src].filter((s, i, arr) => s && arr.indexOf(s) === i);
}

/** Media cell from a rendered panel (picture + video). */
function mediaFromDom(scope, document) {
  const cell = [];
  const picture = scope.querySelector('picture');
  const img = scope.querySelector('picture img, img:not([src^="data:"])');
  let src = '';
  if (picture) {
    const desk = [...picture.querySelectorAll('source[srcset]')].find((s) => !isNotMedia(s.getAttribute('media')));
    if (desk) src = desk.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0];
  }
  if (!src && img) src = img.getAttribute('src') || '';
  if (src) cell.push(makeImg(src, img?.getAttribute('alt'), document));
  const video = scope.querySelector('video');
  if (video) {
    const sources = [...video.querySelectorAll('source[src]')]
      .map((s) => ({ src: s.getAttribute('src'), media: s.getAttribute('media') || '' }))
      .filter((s) => s.src);
    if (video.getAttribute('src')) sources.unshift({ src: video.getAttribute('src'), media: '' });
    pickVideoUrls(sources).forEach((u) => cell.push(linkPara(u, document)));
  }
  return cell;
}

/** Media cell from a flight-data tab ({ sources, poster }). */
function mediaFromFlight(tab, rows, document) {
  const cell = [];
  const media = findInFlight(tab.content, rows, (o) => Array.isArray(o.sources) || (o.poster && o.poster.src));
  const image = media ? null : findInFlight(tab.content, rows, (o) => typeof o.src === 'string' && /images\.ctfassets/.test(o.src));
  if (media) {
    const poster = resolveRef(media.poster, rows);
    if (poster && poster.src) cell.push(makeImg(poster.src, poster.alt, document));
    const sources = (resolveRef(media.sources, rows) || [])
      .map((s) => ({ src: s.src, media: s.media || '' }))
      .filter((s) => s.src);
    pickVideoUrls(sources).forEach((u) => cell.push(linkPara(u, document)));
  } else if (image) {
    cell.push(makeImg(image.src, image.alt, document));
  }
  return cell;
}

export default function parse(element, { document }) {
  // Tabs: [role="tab"]; the scraped DOM drops role attributes -> text-only buttons
  let tabEls = [...element.querySelectorAll('[role="tab"]')];
  if (!tabEls.length) {
    tabEls = [...element.querySelectorAll('button')]
      .filter((b) => clean(b.textContent) && !b.closest('[role="tabpanel"]') && !b.parentElement.querySelector('video'));
  }
  const labels = tabEls.map((t) => clean(t.textContent)).filter(Boolean);
  // Panels: [role="tabpanel"]; fallback -> the nearest id'd wrapper of each <video>
  let domPanels = [...element.querySelectorAll('[role="tabpanel"]')];
  if (!domPanels.length) {
    domPanels = [...element.querySelectorAll('video')]
      .map((v) => {
        let p = v.parentElement;
        while (p && p !== element && !p.id) p = p.parentElement;
        return p && p !== element ? p : v.parentElement;
      })
      .filter((p, i, arr) => p && arr.indexOf(p) === i);
  }

  // DOM media per rendered panel, keyed by label (panel id / aria-labelledby tab) or position
  const domMedia = new Map();
  domPanels.forEach((panel, i) => {
    const cell = mediaFromDom(panel, document);
    if (!cell.length) return;
    let label = '';
    const by = panel.getAttribute('aria-labelledby');
    const tab = by && element.querySelector(`[id="${by}"]`);
    if (tab) label = clean(tab.textContent);
    if (!label) {
      const inner = panel.querySelector('[id]');
      const id = clean(inner?.getAttribute('id') || '');
      label = labels.find((l) => id.toLowerCase().startsWith(l.toLowerCase())) || '';
    }
    if (!label && domPanels.length === labels.length) label = labels[i];
    if (label) domMedia.set(label.toLowerCase(), cell);
  });

  // Flight data: every tab (including those not rendered)
  let flightTabs = [];
  if (labels.some((l) => !domMedia.has(l.toLowerCase())) || !labels.length) {
    const rows = getFlightRows(document);
    const holder = findInAllRows(rows, (o) => {
      const tabs = resolveRef(o.tabs, rows);
      if (!Array.isArray(tabs) || !tabs.length) return false;
      const names = tabs.map((t) => clean(resolveRef(t, rows)?.label || '').toLowerCase());
      return labels.length ? labels.every((l) => names.includes(l.toLowerCase())) : names.every(Boolean);
    });
    if (holder) flightTabs = resolveRef(holder.tabs, rows).map((t) => resolveRef(t, rows));
    flightTabs = flightTabs.map((t) => ({ label: clean(t.label), cell: mediaFromFlight(t, rows, document) }));
  }

  const order = labels.length ? labels : flightTabs.map((t) => t.label);
  const cells = [];
  order.forEach((label) => {
    let cell = domMedia.get(label.toLowerCase());
    if (!cell || !cell.length) cell = flightTabs.find((t) => t.label.toLowerCase() === label.toLowerCase())?.cell || [];
    cells.push([label, cell.length ? cell : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-media', cells });
  element.replaceWith(block);
}
