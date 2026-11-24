/* eslint-disable */
/* global WebImporter */

/**
 * Commerce PDP import: Microsoft Store product page -> EDS page with ACO commerce blocks.
 * Source: https://www.microsoft.com/en-us/d/xbox-nano-controller/8wg5vqp0x4g3
 * Target: /products/xbox-nano-controller/xbox-nano-controller (the URL getProductLink() builds,
 *         so PLP and recommendation links land on this page).
 *
 * Product data (gallery, title, badge, price, buy link, description, tech specs, sticky bar)
 * is NOT imported: the product-details block loads it at runtime from Adobe Commerce Optimizer.
 * Related products use product-recommendations (recid empty until a unit exists in ACO).
 *
 * All selectors verified in migration-work/cleaned.html. Every query runs before main is cleared.
 */

// Source product id -> ACO sku (ACO externalIds microsoft-store-product-id -> sku).
const SKU_BY_STORE_ID = {
  '8wg5vqp0x4g3': 'xbox-nano-controller',
};
const URL_KEY_BY_STORE_ID = {
  '8wg5vqp0x4g3': 'xbox-nano-controller',
};

function clean(text) {
  return (text || '').replace(/[\s​]+/g, ' ').trim();
}

function warn(name, selector) {
  console.warn(`⚠️ ${name}: ${selector} not found in document`);
}

/** Absolute image URL; prefers lazy-load data-src over placeholder src. */
function imgSrc(img, base) {
  const raw = img.getAttribute('data-src') || img.currentSrc || img.getAttribute('src') || '';
  if (!raw || raw.startsWith('data:')) return '';
  try { return new URL(raw, base).href; } catch (e) { return raw; }
}

function image(img, document, base) {
  if (!img) return null;
  const src = imgSrc(img, base);
  if (!src) return null;
  const out = document.createElement('img');
  out.src = src;
  out.alt = clean(img.getAttribute('alt'));
  return out;
}

function el(document, tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Copy inline rich text (links, sup, strong) from a source node; normalise footnote refs. */
function rich(source, document, tag = 'p') {
  const out = document.createElement(tag);
  if (!source) return out;
  const copy = source.cloneNode(true);
  copy.querySelectorAll('svg, .glyph, .sr-only, link').forEach((n) => n.remove());
  copy.querySelectorAll('sup a[href]').forEach((a) => {
    // #footnote1 / #footnotes-uid108f / #1 -> #footnote-N (blocks/footnotes ids)
    const n = clean(a.textContent).replace(/[[\]]/g, '');
    if (/^\d+$/.test(n)) a.setAttribute('href', `#footnote-${n}`);
  });
  copy.querySelectorAll('*').forEach((n) => {
    [...n.attributes].forEach((attr) => { if (!['href', 'src', 'alt'].includes(attr.name)) n.removeAttribute(attr.name); });
  });
  out.innerHTML = copy.innerHTML.replace(/\s+/g, ' ').trim();
  return out;
}

/** Link paragraph; strong = primary button, em = secondary (scripts.js decorateButtons). */
function cta(a, document, style) {
  if (!a) return null;
  const p = document.createElement('p');
  const link = document.createElement('a');
  link.href = a.href || a.getAttribute('href');
  link.textContent = clean(a.textContent);
  if (style === 'primary') { const s = document.createElement('strong'); s.append(link); p.append(s); }
  else if (style === 'secondary') { const e = document.createElement('em'); e.append(link); p.append(e); }
  else p.append(link);
  return p;
}

function heading(src, document, level) {
  if (!src) return null;
  return el(document, level || src.tagName.toLowerCase(), clean(src.textContent));
}

function table(document, name, rows) {
  return WebImporter.DOMUtils.createTable([[name], ...rows], document);
}

// ---------- Standard block parsers (Part 2) ----------

// Section 1 - hero banner: background image + overlay card
function parseHeroBanner(document, base) {
  const root = document.querySelector('main div.highlight');
  if (!root) { warn('parseHeroBanner', 'main div.highlight'); return null; }
  const bg = image(root.querySelector('.card-background img'), document, base);
  const body = root.querySelector('.card-body');
  const content = [];
  const badge = body?.querySelector('.badge');
  if (badge) content.push(el(document, 'p', clean(badge.textContent)));
  const h = body?.querySelector('.component-heading');
  if (h) content.push(el(document, 'h2', clean(h.textContent)));
  const text = body?.querySelector('.mb-4');
  if (text) content.push(rich(text, document));
  body?.querySelectorAll('.link-group a').forEach((a) => {
    // "Buy Now" goes to the store cart for this product
    content.push(cta(a, document, 'primary'));
  });
  return table(document, 'Hero Banner', [[bg || ''], [content.filter(Boolean)]]);
}

// Sections 3 and 9 - image/icon cards
function parseCardsContent(root, document, base, variant) {
  if (!root) { warn('parseCardsContent', variant || '.content-card'); return null; }
  const rows = [...root.querySelectorAll('.card')].map((card) => {
    const img = image(card.querySelector('img'), document, base);
    const body = [];
    const h = card.querySelector('.component-heading, h3, h2');
    if (h) body.push(el(document, 'h3', clean(h.textContent)));
    const text = card.querySelector('.card-body > div, .card-body > p');
    if (text) body.push(rich(text, document));
    card.querySelectorAll('.card-footer a, .link-group a').forEach((a) => body.push(cta(a, document)));
    return [img || '', body.filter(Boolean)];
  });
  return table(document, variant ? `Cards Content (${variant})` : 'Cards Content', rows);
}

// Sections 4 and 7 - image + text feature row (order preserved: text|image or image|text)
function parseColumnsMedia(root, document, base, variant) {
  if (!root) { warn('parseColumnsMedia', '.feature'); return null; }
  const row = root.querySelector('.row');
  const cells = [...(row?.children || [])].map((col) => {
    const img = col.querySelector('img');
    if (img && !col.querySelector('.card-body')) return image(img, document, base) || '';
    const body = col.querySelector('.card-body') || col;
    const out = [];
    // the dark feature has an empty <h2> before the real one: take the first with text
    const h = [...body.querySelectorAll('h1, h2, h3, .component-heading')].find((n) => clean(n.textContent));
    if (h) out.push(el(document, h.tagName === 'H3' ? 'h3' : 'h2', clean(h.textContent)));
    const text = body.querySelector('.mb-3');
    if (text) out.push(rich(text, document));
    body.querySelectorAll('.link-group a').forEach((a) => out.push(cta(a, document, a.classList.contains('btn-primary') ? 'primary' : undefined)));
    return out.filter(Boolean);
  });
  return table(document, variant ? `Columns Media (${variant})` : 'Columns Media', [cells]);
}

// Section 5 - sneak-peek carousel: one row per slide
function parseCarouselCards(document, base) {
  const sel = '#tab-overview .sneakpeekcontentcardscarousel';
  const root = document.querySelector(sel);
  if (!root) { warn('parseCarouselCards', sel); return null; }
  const rows = [...root.querySelectorAll('.carousel-item')].map((item) => {
    const img = image(item.querySelector('img'), document, base);
    const body = [];
    const h = item.querySelector('.component-heading, h3');
    if (h) body.push(el(document, 'h3', clean(h.textContent)));
    const p = item.querySelector('.card-body p');
    if (p) body.push(rich(p, document));
    item.querySelectorAll('.card-footer a').forEach((a) => body.push(cta(a, document)));
    return [img || '', body.filter(Boolean)];
  });
  return table(document, 'Carousel Cards', rows);
}

// Section 6 - mosaic: one cell per column, tiles stacked inside
function parseColumnsMosaic(document, base) {
  const sel = '#tab-overview .mosaic';
  const root = document.querySelector(sel);
  if (!root) { warn('parseColumnsMosaic', sel); return null; }
  const cols = [...root.querySelectorAll(':scope > div > .col')].map((col) => {
    const out = [];
    col.querySelectorAll('.mosaic-tile').forEach((tile) => {
      const h = tile.querySelector('h2, h3, .component-heading');
      if (h) {
        out.push(el(document, 'h2', clean(h.textContent)));
        const p = tile.querySelector('p');
        if (p) out.push(rich(p, document));
        tile.querySelectorAll('.link-group a').forEach((a) => out.push(cta(a, document)));
      } else {
        const img = image(tile.querySelector('img'), document, base);
        if (img) { const p = document.createElement('p'); p.append(img); out.push(p); }
      }
    });
    return out;
  });
  return table(document, 'Columns Mosaic', [cols]);
}

// Section 10 - footnotes (one row per footnote: marker | text)
function parseFootnotes(document) {
  const sel = '#tab-overview .footnotes-component';
  const root = document.querySelector(sel);
  if (!root) { warn('parseFootnotes', sel); return null; }
  const rows = [...root.querySelectorAll('li')].map((li) => {
    // li > a "[N]" (marker) + span (text); hidden "Footnote" labels use .sr-text / .sr-only
    const copy = li.cloneNode(true);
    copy.querySelectorAll('.sr-text, .sr-only').forEach((n) => n.remove());
    const markerLink = copy.querySelector(':scope > a');
    const marker = clean(markerLink?.textContent).replace(/[[\]]/g, '');
    markerLink?.remove();
    return [marker, rich(copy, document)];
  });
  return table(document, 'Footnotes', rows);
}

// ---------- Commerce blocks (Part 1) ----------

function storeIdFrom(url) {
  const m = new URL(url).pathname.match(/\/d\/[^/]+\/([a-z0-9]+)/i);
  return m ? m[1].toLowerCase() : '';
}

export default {
  transform({ document, url, params }) {
    const main = document.body;
    const base = url;
    const storeId = storeIdFrom(params?.originalURL || url);
    const sku = SKU_BY_STORE_ID[storeId] || storeId;
    const urlKey = URL_KEY_BY_STORE_ID[storeId] || sku;

    // STEP 1: extract everything while the source DOM is intact
    const overview = document.querySelector('#tab-overview');
    const headings = overview ? [...overview.querySelectorAll('#layout-container-uid0964 > .areaheading h2')] : [];
    const features = overview ? [...overview.querySelectorAll('.feature')] : [];
    const xfs = overview ? [...overview.querySelectorAll('.experiencefragment')] : [];
    const whyXf = xfs.find((x) => /Why buy/i.test(x.textContent));
    const legalXf = xfs.find((x) => /Discounts:/i.test(x.textContent));
    const productCards = overview?.querySelector('.productcards');

    const hero = parseHeroBanner(document, base);
    const cardsIntroHeading = heading(headings[0], document, 'h2');
    const cardsIntro = parseCardsContent(overview?.querySelector('#layout-container-uid0964 > .content-card'), document, base);
    const easyWayIn = parseColumnsMedia(features[0], document, base);
    const carouselHeading = heading(headings[1], document, 'h2');
    const carousel = parseCarouselCards(document, base);
    const mosaic = parseColumnsMosaic(document, base);
    const gamePass = parseColumnsMedia(features[1], document, base, 'dark');

    const accessoriesHeading = heading(productCards?.querySelector('h2'), document, 'h2');
    const accessoriesSeeAll = cta(productCards?.querySelector('.product-cards-see-all-link'), document);

    const whyHeading = heading(whyXf?.querySelector('h2'), document, 'h2');
    const whyCards = parseCardsContent(whyXf?.querySelector('.content-card'), document, base, 'benefits');
    const whyButton = cta(whyXf?.querySelector('.btn-outline-primary'), document, 'secondary');

    const footnotes = parseFootnotes(document);
    const legal = [];
    if (legalXf) {
      // "Discounts" is div.small, "Returns" an <li>, the rest <p> - keep document order
      legalXf.querySelectorAll('div.small, li, p').forEach((p) => {
        if (p.tagName === 'P' && p.closest('li, div.small')) return;
        if (p.tagName === 'LI' && p.closest('div.small')) return;
        if (clean(p.textContent)) legal.push(rich(p, document));
      });
      if (!legal.length) warn('legal', 'experiencefragment p');
    } else warn('legal', '.experiencefragment (Discounts:)');

    const meta = {
      Title: clean(document.querySelector('title')?.textContent) || 'XBOX Nano Controller | Microsoft Store',
      Description: document.querySelector('meta[name="description"]')?.content || '',
      // light Microsoft Store look (styles.css body.store-pdp); the site default is the dark Surface theme
      Template: 'store-pdp',
    };
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;

    // Commerce block configuration (not DOM-dependent)
    const productDetails = table(document, 'Product Details', [['sku', sku]]);
    const recommendations = table(document, 'Product Recommendations', [['recid', ''], ['currentsku', sku]]);

    // STEP 2: clear - no DOM queries after this line
    main.innerHTML = '';

    // STEP 3: rebuild sections in page order
    const sections = [
      [hero],
      [productDetails],
      [cardsIntroHeading, cardsIntro],
      [easyWayIn],
      [carouselHeading, carousel],
      [mosaic],
      [gamePass],
      [accessoriesHeading, accessoriesSeeAll, recommendations],
      [whyHeading, whyCards, whyButton],
      [footnotes, ...legal],
    ];
    sections.forEach((nodes, i) => {
      const items = nodes.filter(Boolean);
      if (!items.length) return;
      if (main.children.length) main.append(document.createElement('hr'));
      items.forEach((n) => main.append(n));
    });

    // STEP 4: metadata block
    if (ogImage) { const img = document.createElement('img'); img.src = ogImage; meta.Image = img; }
    main.append(WebImporter.Blocks.getMetadataBlock(document, meta));

    const rawPath = `/products/${urlKey}/${sku}`.replace(/\.html?$/i, '').replace(/\/+$/, '') || '/';
    return [{ element: main, path: WebImporter.FileUtils.sanitizePath(rawPath) }];
  },
};
