/*
 * Section Nav
 * Sticky in-page chapter navigation.
 * Content: links to in-page ids, e.g. [Performance](#performance), one per row or as a list.
 *   A link that does not point to an in-page id is matched to a chapter by its label
 *   ("Local AI" → #localai, "Tech specs" → #specs), so the bar still renders and works.
 * - Clicking a link loads any lazy fragments up to the target before scrolling to it,
 *   so chapters that are not loaded yet still work.
 * - The current chapter is highlighted (aria-current) from an IntersectionObserver over the
 *   page's sections; the section list is re-scanned whenever a fragment is inserted.
 *   Above the first chapter the first link is current.
 * - Horizontally scrollable on narrow screens; the list (never the page) smooth-scrolls
 *   to keep the current link centred, clamped to its scroll range.
 * Nothing is measured during decoration (layout reads only happen in observer callbacks).
 */

import { loadUntil, lazyFragmentIds } from '../../scripts/lazy-fragments.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Reads the in-page target id of a link, or null when it points elsewhere.
 * @param {HTMLAnchorElement} a Link
 * @returns {string|null}
 */
function targetId(a) {
  const raw = a.getAttribute('href') || '';
  if (raw.startsWith('#')) return decodeURIComponent(raw.substring(1)) || null;
  try {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
      return null;
    }
    return decodeURIComponent(url.hash.substring(1)) || null;
  } catch {
    return null;
  }
}

const compact = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Matches a link label to a chapter id on the page (or one a lazy fragment will carry):
 * the whole label first ("Local AI" → localai), then its words from last ("Tech specs" → specs).
 * @param {string} label Link text
 * @returns {string|null}
 */
function idFromLabel(label) {
  const ids = [...document.querySelectorAll('main [id]')].map((el) => el.id)
    .concat(lazyFragmentIds());
  const byKey = new Map(ids.map((id) => [compact(id), id]));
  const words = label.split(/\s+/).map(compact).filter(Boolean).reverse();
  const key = [compact(label), ...words].find((k) => byKey.has(k));
  return key ? byKey.get(key) : null;
}

export default function decorate(block) {
  const links = [...block.querySelectorAll('a[href]')]
    .map((a) => ({ a, id: targetId(a) }))
    .filter(({ a }) => a.textContent.trim());
  if (!links.length) return;

  const nav = document.createElement('nav');
  nav.className = 'section-nav-nav';
  nav.setAttribute('aria-label', 'Page sections');
  const list = document.createElement('ul');
  list.className = 'section-nav-list';

  const setTarget = (link, id) => {
    link.dataset.target = id;
    link.href = `#${encodeURIComponent(id)}`;
  };

  // links without an in-page id get one from their label once chapters are known
  // (lazy fragments register after this block, so this re-runs on every scan)
  const resolveTarget = (link) => {
    if (link.dataset.target) return;
    const id = idFromLabel(link.textContent);
    if (id) setTarget(link, id);
  };

  const items = links.map(({ a, id: linkId }) => {
    const link = document.createElement('a');
    link.className = 'section-nav-link';
    link.textContent = a.textContent.trim();
    if (linkId) setTarget(link, linkId);
    else {
      link.dataset.target = '';
      link.href = `#${compact(link.textContent)}`;
    }
    link.addEventListener('click', async (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      resolveTarget(link);
      const id = link.dataset.target;
      if (!id) return;
      e.preventDefault();
      window.history.pushState(null, '', `#${encodeURIComponent(id)}`);
      const target = await loadUntil(id, { behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth' });
      if (!target) return;
      if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
    const li = document.createElement('li');
    li.append(link);
    list.append(li);
    return link;
  });
  nav.append(list);
  block.replaceChildren(nav);

  const resolveTargets = () => items.forEach(resolveTarget);
  resolveTargets();
  let ids = new Set();

  // the current link: the one for the chapter, or the first link above the first chapter
  const linkFor = (id) => (id && items.find((link) => link.dataset.target === id)) || items[0];
  const markActive = (id) => {
    const active = linkFor(id);
    items.forEach((link) => {
      if (link === active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  // scroll only the horizontal list (never the page) so the active link sits centred,
  // clamped to the list's scroll range (matches the source)
  const revealActive = (link) => {
    if (list.scrollWidth <= list.clientWidth) return;
    const listBox = list.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const centred = list.scrollLeft + (linkBox.left - listBox.left)
      - (list.clientWidth - linkBox.width) / 2;
    const left = Math.round(Math.min(Math.max(0, centred), list.scrollWidth - list.clientWidth));
    if (Math.abs(left - list.scrollLeft) < 1) return;
    list.scrollTo({ left, behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth' });
  };

  // above the first chapter (hero, intro) the first link is the current one
  let current = items[0];
  markActive(null);

  // called from observer callbacks only (layout reads are safe there)
  const setActive = (chapterId) => {
    const link = linkFor(chapterId);
    if (link !== current) {
      current = link;
      markActive(chapterId);
    }
    revealActive(link);
  };

  // each top-level section belongs to the closest chapter at or above it in document order
  const chapters = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && chapters.has(entry.target)) {
        setActive(chapters.get(entry.target));
      }
    });
  }, { rootMargin: '-35% 0px -64% 0px' });

  const scan = () => {
    const main = block.closest('main') || document.querySelector('main');
    if (!main) return;
    resolveTargets();
    ids = new Set(items.map((link) => link.dataset.target).filter(Boolean));
    observer.disconnect();
    chapters.clear();
    let chapter = null;
    [...main.children].forEach((section) => {
      // the sticky bar's own section is always on screen; it belongs to no chapter
      if (section.contains(block)) return;
      const own = section.id && ids.has(section.id) ? section.id : null;
      const nested = own ? null : [...ids].find((id) => {
        const el = document.getElementById(id);
        return el && section.contains(el);
      });
      chapter = own || nested || chapter;
      chapters.set(section, chapter);
      observer.observe(section);
    });
    // in-page targets clear the sticky bar when scrolled to
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.style.scrollMarginTop) el.style.scrollMarginTop = 'var(--section-nav-offset, 0px)';
    });
  };

  // decorate may run before the page (or this block) is attached; scan once it is
  setTimeout(scan, 0);
  document.addEventListener('fragment-loaded', scan);

  // publish how much of the viewport top the sticky bar covers (read in observer callbacks only)
  const publishOffset = () => {
    if (!block.isConnected) return;
    const sticky = block.closest('.section') || block;
    const top = parseFloat(getComputedStyle(sticky).top) || 0;
    const offset = Math.ceil(top + nav.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--section-nav-offset', `${offset}px`);
  };
  new ResizeObserver(publishOffset).observe(nav);
  window.matchMedia('(width >= 900px)').addEventListener('change', publishOffset);
}
