/* eslint-disable */
/* global WebImporter */

// Surface product page import.
// One source page → several documents: the main page, one fragment per chapter
// (loaded on scroll by the lazy-fragment block), a shared cross-sell fragment and the
// specs modal. Section boundaries come from the sections transformer, which marks every
// break as <hr data-section-id="section-N">.
//
// The bulk runner saves one document per URL, so the same source URL is imported once per
// output with `?eds-doc=<key>` selecting which document to return: main (default),
// performance, display, local-ai, security, explore-surface, legal, specs.

// PARSER IMPORTS
import heroProductParser from './parsers/hero-product.js';
import sectionNavParser from './parsers/section-nav.js';
import buyBarParser from './parsers/buy-bar.js';
import scrollingSlidesMediaParser from './parsers/scrolling-slides-media.js';
import cardsFeatureMediaParser from './parsers/cards-feature-media.js';
import tabsMediaParser from './parsers/tabs-media.js';
import columnsFeaturesParser from './parsers/columns-features.js';
import scrollingSlidesStoryParser from './parsers/scrolling-slides-story.js';
import columnsSecurityParser from './parsers/columns-security.js';
import cardsProductParser from './parsers/cards-product.js';
import tableSpecsParser from './parsers/table-specs.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import footnotesParser from './parsers/footnotes.js';

// TRANSFORMER IMPORTS
import microsoftCleanupTransformer from './transformers/microsoft-cleanup.js';
import microsoftSectionsTransformer from './transformers/microsoft-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-product': heroProductParser,
  'section-nav': sectionNavParser,
  'buy-bar': buyBarParser,
  'scrolling-slides-media': scrollingSlidesMediaParser,
  'cards-feature-media': cardsFeatureMediaParser,
  'tabs-media': tabsMediaParser,
  'columns-features': columnsFeaturesParser,
  'scrolling-slides-story': scrollingSlidesStoryParser,
  'columns-security': columnsSecurityParser,
  'cards-product': cardsProductParser,
  'table-specs': tableSpecsParser,
  'accordion-faq': accordionFaqParser,
  'footnotes': footnotesParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "surface-product-page",
  "description": "Surface device marketing page split into a main page plus lazy-loaded chapter fragments",
  "urls": [
    "https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra"
  ],
  "blocks": [
    {
      "name": "hero-product",
      "instances": [
        "#r-product-hero"
      ]
    },
    {
      "name": "section-nav",
      "instances": [
        "#chapter-module > section > div:nth-of-type(2)"
      ]
    },
    {
      "name": "buy-bar",
      "instances": [
        "#primaryArea > div:nth-of-type(5)"
      ]
    },
    {
      "name": "scrolling-slides-media",
      "instances": [
        "[id=\"#performance\"] .container-fluid"
      ]
    },
    {
      "name": "cards-feature-media",
      "instances": [
        "[id=\"Feature grid\"]"
      ]
    },
    {
      "name": "tabs-media",
      "instances": [
        "[id=\"#display\"] .relative.mt-10",
            "[id=\"#display\"] div.relative:has([role=\"tab\"]):has(video, img)"
      ]
    },
    {
      "name": "columns-features",
      "instances": [
        "[id=\"PARA WITH COLUMNS\"]"
      ]
    },
    {
      "name": "scrolling-slides-story",
      "instances": [
        "[id=\"PANEL 6: RUN LOCAL. RUN FREE\"]"
      ]
    },
    {
      "name": "columns-security",
      "instances": [
        "[id=\"Surface Pro Ultra - Security That Means Business - Generic Columns\"]"
      ]
    },
    {
      "name": "cards-product",
      "instances": [
        "[id=\"#compare\"] .grid"
      ]
    },
    {
      "name": "table-specs",
      "instances": [
        "[id=\"techspecs\"]"
      ]
    },
    {
      "name": "accordion-faq",
      "instances": [
        "[id=\"Surface Laptop Pro FAQs\"] .inview-root.contents"
      ]
    },
    {
      "name": "footnotes",
      "instances": [
        "#r-page-footnotes"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Hero",
      "selector": [
        "#r-product-hero"
      ],
      "style": null,
      "blocks": [
        "hero-product"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "Inner craft / pinned scrolling slides",
      "selector": [
        "[id=\"#performance\"]"
      ],
      "style": "dark",
      "blocks": [
        "scrolling-slides-media"
      ],
      "defaultContent": [
        "[id=\"#performance\"] .container.text-center h2"
      ]
    },
    {
      "id": "section-3",
      "name": "Feature media cards",
      "selector": [
        "[id=\"Feature grid\"]"
      ],
      "style": "dark",
      "blocks": [
        "cards-feature-media"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "Shines in any setting (tabbed media)",
      "selector": [
        "[id=\"Ultra-tabbed-space\"]",
        "[id=\"#display\"]"
      ],
      "style": "dark",
      "blocks": [
        "tabs-media"
      ],
      "defaultContent": [
        "[id=\"ultra-header-above-tabbed-section\"]",
        "[id=\"#display\"] .container"
      ]
    },
    {
      "id": "section-5",
      "name": "Display feature list",
      "selector": [
        "[id=\"PARA WITH COLUMNS\"]"
      ],
      "style": "dark",
      "blocks": [
        "columns-features"
      ],
      "defaultContent": []
    },
    {
      "id": "section-6",
      "name": "Run local. Run free. intro",
      "selector": [
        "[id=\"ultra-group-panel-7\"]"
      ],
      "style": "dark",
      "blocks": [],
      "defaultContent": [
        "[id=\"ultra-group-panel-7\"]"
      ]
    },
    {
      "id": "section-7",
      "name": "Build / Create / Analyze pinned storytelling",
      "selector": [
        "[id=\"PANEL 6: RUN LOCAL. RUN FREE\"]"
      ],
      "style": null,
      "blocks": [
        "scrolling-slides-story"
      ],
      "defaultContent": []
    },
    {
      "id": "section-8",
      "name": "Yours for the long haul",
      "selector": [
        "[id=\"ultra-group-panel-7-accordion-2\"]"
      ],
      "style": "dark",
      "blocks": [],
      "defaultContent": [
        "[id=\"ultra-group-panel-7-accordion-2\"]"
      ]
    },
    {
      "id": "section-9",
      "name": "Security that means business",
      "selector": [
        "[id=\"#security\"]",
        "[id=\"Surface Pro Ultra - Security That Means Business - Generic Columns\"]",
        "[id=\"ultra-security-business\"]"
      ],
      "style": "dark",
      "blocks": [
        "columns-security"
      ],
      "defaultContent": [
        "[id=\"#security\"]",
        "[id=\"ultra-security-business\"]"
      ]
    },
    {
      "id": "section-10",
      "name": "Explore every level of Surface",
      "selector": [
        "[id=\"#compare\"]"
      ],
      "style": "dark",
      "blocks": [
        "cards-product"
      ],
      "defaultContent": [
        "[id=\"#compare\"] .max-w-2xl h2"
      ]
    },
    {
      "id": "section-11",
      "name": "See full specs CTA",
      "selector": [
        "[id=\"techspecs\"]"
      ],
      "style": "dark",
      "blocks": [
        "table-specs"
      ],
      "defaultContent": [
        "[id=\"techspecs\"] h2, [id=\"techspecs\"] h3, [id=\"techspecs\"] p"
      ]
    },
    {
      "id": "section-12",
      "name": "FAQ",
      "selector": [
        "[id=\"Surface Laptop Pro FAQs\"]"
      ],
      "style": "light",
      "blocks": [
        "accordion-faq"
      ],
      "defaultContent": [
        "[id=\"Surface Laptop Pro FAQs\"] .mb-15"
      ]
    },
    {
      "id": "section-13",
      "name": "Legal footnotes / terms",
      "selector": [
        "#r-page-footnotes"
      ],
      "style": "dark",
      "blocks": [
        "footnotes"
      ],
      "defaultContent": []
    }
  ]
};

// TRANSFORMER REGISTRY
const transformers = [
  microsoftCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [microsoftSectionsTransformer] : []),
];

// SPLIT CONFIGURATION - Embedded from migration-work/fragment-split.json
// 'main page' keeps the section inline; any other value is a fragment path (locale-relative).
const SECTION_TARGETS = {
  "section-1": "main page",
  "section-2": "fragments/surface-laptop-ultra/performance",
  "section-3": "fragments/surface-laptop-ultra/performance",
  "section-4": "fragments/surface-laptop-ultra/display",
  "section-5": "fragments/surface-laptop-ultra/display",
  "section-6": "fragments/surface-laptop-ultra/local-ai",
  "section-7": "fragments/surface-laptop-ultra/local-ai",
  "section-8": "fragments/surface-laptop-ultra/local-ai",
  "section-9": "fragments/surface-laptop-ultra/security",
  "section-10": "fragments/surface/explore-surface",
  "section-11": "main page",
  "section-12": "main page",
  "section-13": "fragments/surface-laptop-ultra/legal"
};
const SECTION_ANCHORS = {
  "section-2": "performance",
  "section-4": "display",
  "section-6": "localai",
  "section-9": "security",
  "section-10": "compare",
  "section-11": "specs"
};
const MAIN = 'main page';
const MODAL_PATH = 'modals/surface-laptop-ultra/specs';
// Placeholder height used when the source section can't be measured
const DEFAULT_PLACEHOLDER_HEIGHT = 1200;

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

/**
 * Measures each fragment's rendered height on the source page, so the placeholders
 * reserve roughly the right amount of space. Runs before any DOM changes.
 */
function measureFragments(document) {
  const heights = {};
  PAGE_TEMPLATE.sections.forEach((section) => {
    const target = SECTION_TARGETS[section.id];
    if (!target || target === MAIN) return;
    // a section can span several sibling containers: add up every one that matches
    const els = [...new Set(section.selector.map((s) => {
      try { return document.querySelector(s); } catch (e) { return null; }
    }).filter(Boolean))];
    let h = 0;
    // display:contents wrappers report 0; fall back to the span of their children
    const height = (el) => {
      const own = el.getBoundingClientRect();
      if (own.height > 0) return own.height;
      const boxes = [...el.children].map((c) => c.getBoundingClientRect()).filter((r) => r.height > 0);
      if (!boxes.length) return 0;
      return Math.max(...boxes.map((r) => r.bottom)) - Math.min(...boxes.map((r) => r.top));
    };
    try { h = els.reduce((sum, el) => sum + height(el), 0); } catch (e) { h = 0; }
    heights[target] = (heights[target] || 0) + h;
  });
  Object.keys(heights).forEach((k) => {
    heights[k] = Math.round(heights[k] / 10) * 10 || DEFAULT_PLACEHOLDER_HEIGHT;
  });
  return heights;
}

function isMarker(node) {
  return node.nodeType === 1 && node.matches('hr[data-section-id]');
}

/**
 * Walks the document in order and buckets every top-level content unit under the
 * section whose marker precedes it. Markers sit at different depths, so descend into
 * any element that still contains one.
 */
function collectSections(root) {
  const buckets = {};
  const order = [];
  let current = PAGE_TEMPLATE.sections[0].id;
  const push = (node) => {
    if (!buckets[current]) { buckets[current] = []; order.push(current); }
    buckets[current].push(node);
  };
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (isMarker(child)) {
        current = child.getAttribute('data-section-id');
        child.remove();
      } else if (child.nodeType === 1 && child.querySelector('hr[data-section-id]')) {
        walk(child);
      } else if (child.nodeType === 1 || (child.nodeType === 3 && child.textContent.trim())) {
        push(child);
      }
    });
  };
  walk(root);
  return { buckets, order };
}

function blockName(table) {
  const first = table.querySelector('tr th, tr td');
  return first ? first.textContent.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

/** Pulls a block table (by name) out of a list of nodes. */
function takeBlock(nodes, name) {
  const key = name.replace(/[^a-z0-9]/g, '');
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    if (n.nodeType !== 1) continue;
    const table = n.matches('table') ? n : null;
    if (table && blockName(table) === key) {
      nodes.splice(i, 1);
      return table;
    }
    const nested = [...n.querySelectorAll('table')].find((tb) => blockName(tb) === key);
    if (nested) {
      nested.remove();
      return nested;
    }
  }
  return null;
}

/** Pulls every [data-modal] element out of a list of nodes, in order. */
function takeModalContent(nodes) {
  const out = [];
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const n = nodes[i];
    if (n.nodeType !== 1) continue;
    if (n.hasAttribute('data-modal')) {
      out.unshift(n);
      nodes.splice(i, 1);
    } else {
      const inner = [...n.querySelectorAll('[data-modal]')];
      inner.forEach((el) => el.remove());
      out.unshift(...inner);
    }
  }
  out.forEach((el) => el.removeAttribute('data-modal'));
  return out;
}

function newDoc(document) {
  return document.createElement('div');
}

/** Appends sections to a document element, separated by <hr>. */
function appendSection(document, docEl, nodes) {
  if (!nodes || !nodes.length) return;
  if (docEl.childNodes.length) docEl.append(document.createElement('hr'));
  nodes.forEach((n) => docEl.append(n));
}

function lazyFragmentSection(document, href, id, height) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = href;
  const cells = [[a]];
  if (id) cells.push(['id', id]);
  if (height) cells.push(['height', `${height}px`]);
  return [WebImporter.Blocks.createBlock(document, { name: 'Lazy Fragment', cells })];
}

function noindexMetadata(document, title) {
  return WebImporter.Blocks.getMetadataBlock(document, {
    Title: title,
    Robots: 'noindex, nofollow',
  });
}

function localePrefix(pathname) {
  const m = pathname.match(/^\/([a-z]{2}-[a-z]{2})\//i);
  return m ? `/${m[1].toLowerCase()}` : '';
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;
    const sourcePath = new URL(params.originalURL).pathname;
    const locale = localePrefix(sourcePath);
    const fragmentHref = (target) => `${locale}/${target}`;

    // 0. Measure placeholder heights on the rendered source page
    const heights = measureFragments(document);

    // 1. beforeTransform (cleanup, section markers)
    executeTransformers('beforeTransform', main, payload);

    // 2–3. Parse blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup, section metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. Page metadata comes from the source <head>; build it before main is emptied
    const metaHost = document.createElement('div');
    WebImporter.rules.createMetadata(metaHost, document);
    const pageTitle = document.title || '';

    // 6. Split into documents
    const { buckets, order } = collectSections(main);
    main.querySelectorAll('[data-section-id]').forEach((el) => el.removeAttribute('data-section-id'));
    order.forEach((id) => (buckets[id] || []).forEach((n) => {
      if (n.nodeType === 1) {
        n.removeAttribute('data-section-id');
        n.querySelectorAll('[data-section-id]').forEach((el) => el.removeAttribute('data-section-id'));
      }
    }));

    const mainDoc = newDoc(document);
    const fragments = {}; // target -> element
    const fragmentOrder = [];
    let modalNodes = [];

    // hero section: hero + buy bar; the section nav gets its own (sticky) section
    const heroNodes = buckets[order[0]] || [];
    const sectionNav = takeBlock(heroNodes, 'section-nav');
    appendSection(document, mainDoc, heroNodes);
    if (sectionNav) appendSection(document, mainDoc, [sectionNav]);

    order.slice(1).forEach((id) => {
      const nodes = buckets[id] || [];
      modalNodes = modalNodes.concat(takeModalContent(nodes));
      const target = SECTION_TARGETS[id] || MAIN;
      if (target === MAIN) {
        appendSection(document, mainDoc, nodes);
        return;
      }
      if (!fragments[target]) {
        fragments[target] = newDoc(document);
        fragmentOrder.push(target);
        appendSection(document, mainDoc, lazyFragmentSection(
          document,
          fragmentHref(target),
          SECTION_ANCHORS[id],
          heights[target],
        ));
      }
      appendSection(document, fragments[target], nodes);
    });

    // metadata in its own section, so the last placeholder stays alone in its section
    mainDoc.append(document.createElement('hr'));
    [...metaHost.childNodes].forEach((n) => mainDoc.append(n));

    WebImporter.rules.transformBackgroundImages(mainDoc, document);
    WebImporter.rules.adjustImageUrls(mainDoc, url, params.originalURL);

    const rawPath = sourcePath.replace(/\/$/, '').replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    const outputs = [{
      element: mainDoc,
      path,
      report: {
        title: pageTitle,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
        fragments: fragmentOrder.map(fragmentHref),
        modal: modalNodes.length ? fragmentHref(MODAL_PATH) : '',
      },
    }];

    fragmentOrder.forEach((target) => {
      const el = fragments[target];
      el.append(noindexMetadata(document, `${pageTitle} – ${target.split('/').pop()}`));
      WebImporter.rules.transformBackgroundImages(el, document);
      WebImporter.rules.adjustImageUrls(el, url, params.originalURL);
      outputs.push({
        element: el,
        path: WebImporter.FileUtils.sanitizePath(fragmentHref(target)),
        report: { title: target, template: `${PAGE_TEMPLATE.name} (fragment)`, parent: path },
      });
    });

    if (modalNodes.length) {
      const modal = newDoc(document);
      modalNodes.forEach((n) => modal.append(n));
      modal.append(noindexMetadata(document, `${pageTitle} – specs`));
      WebImporter.rules.adjustImageUrls(modal, url, params.originalURL);
      outputs.push({
        element: modal,
        path: WebImporter.FileUtils.sanitizePath(fragmentHref(MODAL_PATH)),
        report: { title: 'specs', template: `${PAGE_TEMPLATE.name} (modal)`, parent: path },
      });
    }

    // standalone CTA links that are buttons on the source become primary buttons (bold)
    const CTA_TEXT = ['Get details', 'Explore Surface for Business'];
    outputs.forEach(({ element }) => {
      element.querySelectorAll('a').forEach((a) => {
        if (!CTA_TEXT.includes(a.textContent.trim()) || a.closest('strong, table')) return;
        const strong = document.createElement('strong');
        a.replaceWith(strong);
        strong.append(a);
      });
    });

    // the "Get details" link must point at the localized modal path
    outputs.forEach(({ element }) => {
      element.querySelectorAll(`a[href$="/${MODAL_PATH}"]`).forEach((a) => {
        a.href = fragmentHref(MODAL_PATH);
      });
    });

    const wanted = new URL(params.originalURL).searchParams.get('eds-doc') || 'main';
    const keyOf = (output, i) => (i === 0 ? 'main' : output.path.split('/').pop());
    const selected = outputs.filter((o, i) => keyOf(o, i) === wanted);
    if (!selected.length) {
      throw new Error(`Unknown eds-doc "${wanted}". Available: ${outputs.map(keyOf).join(', ')}`);
    }
    return selected;
  },
};
