/*
 * Lazy Fragment Block
 * Holds space for a fragment and loads it when the visitor scrolls near it.
 * Row 1: link to the fragment. Optional rows: "id | performance", "height | 1800px".
 */

import { readBlockConfig } from '../../scripts/aem.js';
import { registerLazyFragment } from '../../scripts/lazy-fragments.js';

export default function decorate(block) {
  const link = block.querySelector(':scope > div:first-child a');
  const path = link
    ? new URL(link.href, window.location).pathname
    : block.firstElementChild?.textContent.trim();
  // single-cell link row is ignored; two-cell rows become config
  const config = readBlockConfig(block);
  if (!path || !path.startsWith('/')) return;

  const wrapper = block.closest('.lazy-fragment-wrapper');
  const section = block.closest('.section');
  const el = section && section.children.length === 1 ? section : wrapper;
  const id = config.id || section?.id || undefined;
  if (config.id && el !== section) el.id = config.id;

  el.classList.add('lazy-fragment-pending');
  if (config.height) el.style.minHeight = config.height;
  block.textContent = '';
  block.setAttribute('aria-busy', 'true');

  registerLazyFragment(el, path, id);
}
