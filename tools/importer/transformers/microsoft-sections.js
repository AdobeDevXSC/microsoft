/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: microsoft.com (Surface product pages) section breaks + Section Metadata.
 *
 * Driven by payload.template.sections (tools/importer/page-templates.json). Section
 * boundary selectors come from that file and were verified in migration-work/cleaned.html:
 *   section-1  #r-product-hero
 *   section-2  [id="#performance"]               section-8  [id="ultra-group-panel-7-accordion-2"]
 *   section-3  [id="Feature grid"]               section-9  [id="#security"] (+ Generic Columns + ultra-security-business siblings)
 *   section-4  [id="#display"]                   section-10 [id="#compare"]
 *   section-5  [id="PARA WITH COLUMNS"]          section-11 [id="techspecs"]
 *   section-6  [id="ultra-group-panel-7"]        section-12 [id="Surface Laptop Pro FAQs"]
 *   section-7  [id="PANEL 6: RUN LOCAL. RUN FREE"]  section-13 #r-page-footnotes
 *
 * SECTION-ID MARKER (consumed by the import script for the main page / fragment split):
 *   - Every section break is an <hr data-section-id="section-N"> (N = 2..13), inserted
 *     immediately before the section's first boundary element. The attribute is NOT removed,
 *     so it is still on the <hr> when the import script's transform() runs.
 *   - section-1 has no leading <hr> (it is the first section): everything before
 *     hr[data-section-id="section-2"] belongs to section-1.
 *   - A section spans from its <hr> up to (not including) the next hr[data-section-id].
 *     The <hr>s are nested at different depths (e.g. inside #chapter-module), so walk the
 *     document in order (TreeWalker / compareDocumentPosition) rather than siblings only.
 *   - Each Section Metadata table also carries data-section-id="section-N".
 *
 * Section 9 spans three sibling containers ([id="#security"] heading, the Generic Columns
 * container and [id="ultra-security-business"] CTA). The <hr> goes before the first one that
 * exists; the other two follow it in DOM order and so stay in section 9 until the section-10
 * break before [id="#compare"].
 *
 * Section Metadata rows: `style` (when non-null in page-templates.json) and `id` (anchor id
 * from migration-work/fragment-split.json `anchorId`).
 *
 * Page-level blocks that belong to no template section (section-nav lives inside
 * #chapter-module after the chapters, buy-bar is main > div:nth-of-type(5) after the
 * footnotes) are moved after parsing to the end of section-1 (main page), i.e. directly
 * before hr[data-section-id="section-2"], so they are not swept into section-11 / the
 * legal fragment (section-13).
 */

const SECTION_ID_ATTR = 'data-section-id';

// From migration-work/fragment-split.json (`anchorId` per section id).
const SECTION_ANCHOR_IDS = {
  'section-2': 'performance',
  'section-4': 'display',
  'section-6': 'localai',
  'section-9': 'security',
  'section-10': 'compare',
  'section-11': 'specs',
};

// Normalised block names of page-level blocks to relocate into section-1 (in this order).
const PAGE_LEVEL_BLOCKS = ['sectionnav', 'buybar'];

// section.selector is an array of candidate selectors - first match wins.
function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    let el = null;
    try { el = root.querySelector(sel); } catch (e) { el = null; }
    if (el) return el;
  }
  return null;
}

function normaliseName(text) {
  return (text || '').toLowerCase().replace(/\(.*\)/, '').replace(/[^a-z0-9]/g, '');
}

function findBlockTable(root, normalisedName) {
  return [...root.querySelectorAll('table')].find((table) => {
    const firstCell = table.querySelector('tr > th, tr > td');
    return firstCell && normaliseName(firstCell.textContent) === normalisedName;
  }) || null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length < 2) return;
  const doc = element.ownerDocument;

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers replace section elements. Reverse order keeps
    // not-yet-processed section elements where querySelector found them.
    for (let i = sections.length - 1; i >= 1; i -= 1) {
      const section = sections[i];
      if (element.querySelector(`hr[${SECTION_ID_ATTR}="${section.id}"]`)) continue; // idempotent
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched on this page - never guess
      const hr = doc.createElement('hr');
      hr.setAttribute(SECTION_ID_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Section Metadata (style + id), anchored right after each section's marker <hr>.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const cells = {};
      if (section.style) cells.style = section.style;
      const anchorId = section.anchorId || SECTION_ANCHOR_IDS[section.id];
      if (anchorId) cells.id = anchorId;
      if (!Object.keys(cells).length) continue;
      if (element.querySelector(`table[${SECTION_ID_ATTR}="${section.id}"]`)) continue; // idempotent

      const marker = element.querySelector(`hr[${SECTION_ID_ATTR}="${section.id}"]`);
      const anchor = marker || (i === 0 ? querySection(element, section.selector) : null);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells,
      });
      metadataBlock.setAttribute(SECTION_ID_ATTR, section.id);
      if (marker) {
        marker.after(metadataBlock);
      } else {
        anchor.after(metadataBlock); // section-1 (no leading <hr>)
      }
    }

    // Relocate page-level blocks (section-nav, buy-bar) to the end of section-1.
    const firstBreak = element.querySelector(`hr[${SECTION_ID_ATTR}="${sections[1].id}"]`);
    if (firstBreak) {
      PAGE_LEVEL_BLOCKS.forEach((name) => {
        const table = findBlockTable(element, name);
        if (table) firstBreak.before(table);
      });
    }
  }
}
