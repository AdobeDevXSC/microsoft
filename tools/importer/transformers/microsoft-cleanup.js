/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: microsoft.com (Surface product pages) site-wide cleanup.
 *
 * All selectors below were taken from migration-work/cleaned.html
 * (https://www.microsoft.com/en-us/surface/devices/surface-laptop-ultra):
 *   - <div id="msccBannerV2">                     cookie banner (x2, inside and outside <uhf-cookie-banner>)
 *   - <div class="cge-uhf-header"> / <uhf-header>  UHF global header (contains the only DM/Scene7 image: MS logo)
 *   - <a class="uhf-skip-link">                    "Skip to main content"
 *   - <div class="cge-uhf-footer"> / <uhf-footer> / <footer id="uhf-footer">  UHF global footer
 *   - <div id="ClickTaleDiv">                      analytics container
 *   - <div id="batBeacon...">, <img id="batBeacon..." src="https://bat.bing.com/...">  tracking pixels
 *   - <iframe src="https://...fls.doubleclick.net/...">  tracking iframe
 *   - <link href="https://uhf.microsoft.com/...css">     UHF stylesheet
 *   - <img src="data:image/svg+xml;base64,...">    44 inline UI icons (play/pause, chevrons, plus) in buttons/CTAs
 *   - <h2|h3|p> <span><div class="st-line"><div class="st-word">..</div></div></span>
 *               <span class="sr-only">TEXT</span> </h2|h3|p>   animated split-text headings (11 on page)
 *   - <a href="#footnote-N"> inside <sup id="ref-N">  footnote references ([*] note -> #footnote-star)
 *   - <button>Expand all</button> / <button>Collapse all</button>  FAQ header UI controls
 *   - <video><source src="https://videos.ctfassets.net/...mp4"></video>  (kept for parsers, normalised afterwards)
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Non-authorable global chrome, consent and tracking (selectors from cleaned.html).
const CHROME_SELECTORS = [
  '#msccBannerV2',
  'uhf-cookie-banner',
  '.cge-uhf-header',
  'uhf-header',
  'a.uhf-skip-link',
  '.cge-uhf-footer',
  'uhf-footer',
  '#uhf-footer',
  '#ClickTaleDiv',
  '[id^="batBeacon"]',
  'img[src*="bat.bing.com"]',
  'script',
  'style',
  'noscript',
  'iframe',
  'link',
];

function collapse(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// 1x1 tracking pixels (width/height attributes of 1, or known beacon hosts).
function removeTrackingPixels(root) {
  root.querySelectorAll('img').forEach((img) => {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    if ((w === '1' || w === '0') && (h === '1' || h === '0')) img.remove();
  });
}

// Animated headings render the text twice: split-line .st-line/.st-word divs
// plus a .sr-only copy. Keep exactly one clean copy (the sr-only text, with
// whitespace collapsed), kept in a <span class="sr-only"> so parsers that look
// for it still work; the span is unwrapped to plain text in afterTransform.
function normalizeAnimatedHeadings(root) {
  root.querySelectorAll('.sr-only').forEach((sr) => {
    const host = sr.parentElement;
    if (!host || !host.querySelector('.st-line')) return;
    const text = collapse(sr.textContent);
    if (!text) return;
    sr.textContent = text;
    sr.setAttribute('data-heading-text', '');
    if (/^(H[1-6]|P)$/.test(host.tagName)) {
      // Heading/paragraph holds nothing but the animated copy + sr-only copy
      // (and sometimes a repeated text node) -> keep only the sr-only text.
      host.replaceChildren(sr);
    } else {
      [...host.children].forEach((child) => {
        if (child !== sr && (child.matches('.st-line') || child.querySelector('.st-line'))) child.remove();
      });
    }
  });
  // Split-text without an sr-only copy: flatten the words into plain text.
  root.querySelectorAll('.st-line').forEach((line) => {
    const doc = line.ownerDocument;
    line.replaceWith(doc.createTextNode(`${collapse(line.textContent)} `));
  });
}

// Footnote references: the [*] note is linked as #footnote-* -> #footnote-star.
// #footnote-N links are left untouched; <sup> wrappers are kept.
function rewriteFootnoteLinks(root) {
  root.querySelectorAll('a[href*="#footnote-"]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const idx = href.indexOf('#footnote-');
    const frag = decodeURIComponent(href.slice(idx + '#footnote-'.length));
    if (frag === '*') a.setAttribute('href', '#footnote-star');
  });
}

// Any <video> a parser did not consume: replace with plain MP4 links in source
// order (desktop first, mobile second). The poster <picture>/<img> already
// sits next to the video in this DOM; a poster attribute, if present, is
// emitted as an <img> before the links.
function videosToLinks(root) {
  root.querySelectorAll('video').forEach((video) => {
    const doc = video.ownerDocument;
    const srcs = [];
    if (video.getAttribute('src')) srcs.push(video.getAttribute('src'));
    video.querySelectorAll('source[src]').forEach((s) => srcs.push(s.getAttribute('src')));
    const unique = [...new Set(srcs.filter(Boolean))];
    const frag = doc.createDocumentFragment();
    const poster = video.getAttribute('poster');
    if (poster) {
      const img = doc.createElement('img');
      img.src = poster;
      frag.append(img);
    }
    unique.forEach((src) => {
      const p = doc.createElement('p');
      const a = doc.createElement('a');
      a.href = src;
      a.textContent = src;
      p.append(a);
      frag.append(p);
    });
    video.replaceWith(frag);
  });
}

function removeComments(root) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 128 /* NodeFilter.SHOW_COMMENT */);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    WebImporter.DOMUtils.remove(element, CHROME_SELECTORS);
    removeTrackingPixels(element);
    // Inline SVG UI icons (play/pause, CTA chevrons, accordion plus) - never authored.
    WebImporter.DOMUtils.remove(element, ['img[src^="data:image/svg+xml"]']);
    // FAQ header UI controls: <button>Expand all</button> / <button>Collapse all</button>
    // (in [id="Surface Laptop Pro FAQs"] .mb-15, outside the accordion-faq block).
    element.querySelectorAll('button').forEach((btn) => {
      if (/^(expand|collapse) all$/i.test(collapse(btn.textContent))) btn.remove();
    });
    normalizeAnimatedHeadings(element);
    rewriteFootnoteLinks(element);
    // NOTE: <video>/<source> are intentionally kept here so block parsers can read the MP4 URLs.
  }

  if (hookName === TransformHook.afterTransform) {
    // Re-run chrome removal in case anything was re-introduced / lives outside parsed blocks.
    WebImporter.DOMUtils.remove(element, CHROME_SELECTORS);
    removeTrackingPixels(element);
    rewriteFootnoteLinks(element);
    videosToLinks(element);
    // Empty <source> placeholders left in <picture> (no src/srcset in the scraped DOM).
    element.querySelectorAll('picture > source').forEach((s) => {
      if (!s.getAttribute('srcset') && !s.getAttribute('src')) s.remove();
    });
    // Icon-only buttons (play/pause, expand/collapse all) have no authorable text.
    element.querySelectorAll('button').forEach((btn) => {
      const clone = btn.cloneNode(true);
      clone.querySelectorAll('.sr-only').forEach((s) => s.remove());
      if (!collapse(clone.textContent) && !btn.querySelector('img, picture')) btn.remove();
    });
    // Canonical heading copies -> plain text; any other screen-reader-only helper text is dropped.
    element.querySelectorAll('span.sr-only').forEach((sr) => {
      if (sr.hasAttribute('data-heading-text')) {
        sr.replaceWith(sr.ownerDocument.createTextNode(sr.textContent));
      } else {
        sr.remove();
      }
    });
    removeComments(element);
  }
}
