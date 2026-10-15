/*
 * Lazy fragments
 * Loads fragment content into placeholder sections as they approach the viewport,
 * and makes sure in-page links (#id) still land on content that is not loaded yet.
 */

// eslint-disable-next-line import/no-cycle
import { loadFragment } from '../blocks/fragment/fragment.js';

const ROOT_MARGIN = '800px 0px';
const entries = [];
let observer;
let clicksHandled = false;

function byDocumentOrder(a, b) {
  // eslint-disable-next-line no-bitwise
  return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function pending() {
  return entries.filter((entry) => !entry.loaded).sort(byDocumentOrder);
}

function fallback(entry) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = entry.path;
  a.textContent = entry.path;
  p.append(a);
  entry.el.classList.remove('lazy-fragment-pending');
  entry.el.style.minHeight = '';
  const wrapper = entry.el.matches('.lazy-fragment-wrapper') ? entry.el : entry.el.querySelector('.lazy-fragment-wrapper');
  wrapper?.replaceWith(p);
}

/**
 * Loads a registered fragment and swaps it in for its placeholder section.
 * @param {Object} entry Registry entry
 * @returns {Promise<void>}
 */
function load(entry) {
  if (entry.promise) return entry.promise;
  observer?.unobserve(entry.el);
  entry.promise = (async () => {
    const fragment = await loadFragment(entry.path).catch(() => null);
    entry.loaded = true;
    if (!fragment) {
      fallback(entry);
      return;
    }
    const sections = [...fragment.querySelectorAll(':scope > .section')];
    if (entry.id && sections[0] && !sections[0].id) sections[0].id = entry.id;
    if (entry.el.matches('.section')) {
      entry.el.replaceWith(...fragment.childNodes);
    } else {
      // placeholder shares its section with other content; flatten the fragment into it
      sections.forEach((section) => entry.el.before(...section.childNodes));
      entry.el.remove();
    }
    document.dispatchEvent(new CustomEvent('fragment-loaded', {
      detail: { id: entry.id, path: entry.path, sections },
    }));
  })();
  return entry.promise;
}

/**
 * Loads every pending fragment above (and including) the element with the given id,
 * then scrolls to it. If the id is not on the page yet, fragments load in order
 * until it appears.
 * @param {string} id Target element id
 * @param {Object} [options] scrollIntoView options
 * @returns {Promise<Element|null>} The target element
 */
export async function loadUntil(id, options = {}) {
  let target = document.getElementById(id);
  if (target) {
    const above = pending().filter((entry) => entry.el === target
      // eslint-disable-next-line no-bitwise
      || entry.el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
    await Promise.all(above.map(load));
  } else {
    // eslint-disable-next-line no-restricted-syntax
    for (const entry of pending()) {
      // eslint-disable-next-line no-await-in-loop
      await load(entry);
      if (document.getElementById(id)) break;
    }
  }
  target = document.getElementById(id);
  target?.scrollIntoView(options);
  return target;
}

function handleClicks() {
  if (clicksHandled) return;
  clicksHandled = true;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const url = new URL(a.href);
    if (url.pathname !== window.location.pathname || !url.hash || url.hash === '#') return;
    const id = decodeURIComponent(url.hash.substring(1));
    const target = document.getElementById(id);
    const blocked = pending().some((entry) => !target || entry.el === target
      // eslint-disable-next-line no-bitwise
      || entry.el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!blocked) return;
    e.preventDefault();
    window.history.pushState(null, '', url.hash);
    loadUntil(id, { behavior: 'smooth' });
  });
}

/**
 * Registers a placeholder to be filled with a fragment when it nears the viewport.
 * @param {Element} el Placeholder section (or block wrapper when it shares a section)
 * @param {string} path Fragment path
 * @param {string} [id] Id to carry over to the fragment's first section
 */
export function registerLazyFragment(el, path, id) {
  const entry = {
    el, path, id, loaded: false,
  };
  entries.push(entry);
  if (!observer) {
    observer = new IntersectionObserver((items) => {
      items.forEach((item) => {
        if (!item.isIntersecting) return;
        const match = entries.find((e) => e.el === item.target);
        if (match) load(match);
      });
    }, { rootMargin: ROOT_MARGIN });
  }
  observer.observe(el);
  handleClicks();
  return entry;
}

/**
 * Loads all pending fragments, e.g. before printing.
 * @returns {Promise<void[]>}
 */
export function loadAllLazyFragments() {
  return Promise.all(pending().map(load));
}

/**
 * @returns {boolean} Whether any fragment is still waiting to load
 */
export function hasPendingFragments() {
  return pending().length > 0;
}
