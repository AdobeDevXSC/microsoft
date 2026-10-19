/*
 * Tabs (media)
 * A tablist switching between media panels.
 * One row per tab: label cell | panel cell (poster image + MP4 links, optional text).
 * A bold label (<strong>/<b>) marks the initially selected tab; otherwise the first tab is.
 * ARIA tabs pattern with roving tabindex and arrow-key navigation; hidden panels' videos pause.
 */

import { toClassName } from '../../scripts/aem.js';
import { createOptimizedPicture } from '../../scripts/images.js';
import { buildVideo, pauseVideos } from '../../scripts/video.js';

let instance = 0;

export default function decorate(block) {
  instance += 1;
  const prefix = `tabs-media-${instance}`;
  const rows = [...block.children].filter((row) => row.textContent.trim() || row.querySelector('picture, img'));

  const tablist = document.createElement('div');
  tablist.className = 'tabs-media-list';
  tablist.setAttribute('role', 'tablist');
  const panels = document.createElement('div');
  panels.className = 'tabs-media-panels';

  const tabs = [];
  const tabpanels = [];
  let initial = -1;

  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      tabpanels[i].hidden = !selected;
      if (!selected) pauseVideos(tabpanels[i]);
    });
    if (focus) tabs[index].focus();
  };

  rows.forEach((row, i) => {
    const cells = [...row.children];
    // label: first cell, unless it is the only cell
    const label = cells.length > 1 ? cells[0] : null;
    const content = cells.length > 1 ? cells.slice(1) : cells;
    // a bold label marks the default tab; the rendered label stays plain text
    if (initial < 0 && label?.querySelector('strong, b')) initial = i;
    const text = label?.textContent.trim() || `Tab ${i + 1}`;
    const id = `${prefix}-${toClassName(text) || i}`;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tabs-media-tab';
    tab.id = `${id}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${id}-panel`);
    tab.textContent = text;
    tab.addEventListener('click', () => select(i));
    tablist.append(tab);
    tabs.push(tab);

    const panel = document.createElement('div');
    panel.className = 'tabs-media-panel';
    panel.id = `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    content.forEach((cell) => panel.append(...cell.childNodes));
    if (!buildVideo(panel, { loop: true, autoplay: true, controls: true })) {
      panel.querySelectorAll('picture > img').forEach((img) => {
        img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '1200' }]));
      });
    }
    panels.append(panel);
    tabpanels.push(panel);
  });

  if (!tabs.length) return;

  tablist.addEventListener('keydown', (e) => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    const last = tabs.length - 1;
    const next = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next, true);
  });

  block.replaceChildren(tablist, panels);
  select(Math.max(initial, 0));
}
