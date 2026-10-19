/*
 * Header block
 * Renders the nav fragment (brand, contextual nav, global megamenu, tools, mobile extras)
 * as a click-to-open dropdown header. On desktop, items that don't fit the bar move into an
 * overflow menu; on mobile the global menu opens from a hamburger and the contextual nav
 * from a site-name row, both as accordion lists. All copy and links come from the nav
 * document; this file only adds structure, controls and behaviour.
 */

const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the nav fragment: local preview serves it under /content, DA/EDS at the root.
 * @returns {Promise<{doc: Element, base: string}|null>}
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const doc = document.createElement('div');
  doc.innerHTML = await resp.text();
  // relative media paths are relative to the fragment, not the page
  doc.querySelectorAll('img[src], source[srcset]').forEach((media) => {
    const attr = media.hasAttribute('src') ? 'src' : 'srcset';
    const value = media.getAttribute(attr);
    if (value && !/^(https?:|\/|data:)/.test(value)) media.setAttribute(attr, new URL(value, resp.url).href);
  });
  return { doc, base: resp.url };
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  });
  node.append(...children.filter(Boolean));
  return node;
}

let panelCount = 0;
const nextId = () => {
  panelCount += 1;
  return `nav-panel-${panelCount}`;
};

function setExpanded(button, open) {
  button.setAttribute('aria-expanded', String(open));
  document.getElementById(button.getAttribute('aria-controls'))?.toggleAttribute('hidden', !open);
}

/** Mirrors "any top-level panel open" on the nav element (used by page styles). */
function syncNavState(nav) {
  const open = !!nav.querySelector('[data-top-level][aria-expanded="true"]');
  nav.setAttribute('aria-expanded', String(open));
  nav.querySelectorAll('.nav-hamburger button').forEach((b) => {
    const target = document.getElementById(b.getAttribute('aria-controls'));
    b.setAttribute('aria-expanded', String(!!target && !target.hidden));
  });
}

/** Closes every top-level panel (optionally keeping one) and, on desktop, nested ones too. */
function closeAll(nav, except) {
  // desktop column titles are permanently open and the site-name row is mobile-only
  const selector = isDesktop.matches
    ? '[aria-expanded="true"][aria-controls]:not(.nav-mega-title, .nav-discover)'
    : '[data-top-level][aria-expanded="true"]';
  nav.querySelectorAll(selector).forEach((btn) => {
    if (btn !== except && !btn.closest('.nav-hamburger')) setExpanded(btn, false);
  });
  syncNavState(nav);
}

/**
 * Wires a button to show/hide a panel.
 * Desktop: one panel at a time. Mobile: accordions inside a menu stay independent.
 * @param {Element} button Trigger
 * @param {Element} panel Panel
 */
function wireToggle(button, panel) {
  if (!panel.id) panel.id = nextId();
  panel.setAttribute('hidden', '');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', panel.id);
  button.addEventListener('click', () => {
    const nav = button.closest('nav');
    // the panel's own visibility is the source of truth (aria-expanded mirrors it)
    const open = panel.hasAttribute('hidden');
    // desktop: only panel-internal toggles nest; mobile: everything inside a menu is an accordion
    const nested = isDesktop.matches ? !!button.closest('.nav-panel') : !!button.closest('.nav-sections, .nav-mega');
    if (!nested) closeAll(nav, button);
    setExpanded(button, open);
    syncNavState(nav);
  });
}

/**
 * Builds a disclosure: a button that shows/hides a panel.
 * @param {string} label Button text
 * @param {Element} panel Panel content
 * @param {string} className Modifier class for the item
 * @param {boolean} topLevel Whether the trigger sits in the bar
 * @returns {Element} li element
 */
function disclosure(label, panel, className, topLevel) {
  const button = el('button', { type: 'button', class: 'nav-trigger' }, el('span', {}, label));
  if (topLevel) button.dataset.topLevel = '';
  wireToggle(button, panel);
  return el('li', { class: `nav-item nav-drop ${className}` }, button, panel);
}

function linkItem(a) {
  const link = a.cloneNode(true);
  link.className = 'nav-link';
  return el('li', { class: 'nav-item' }, link);
}

function panelList(ul) {
  const list = el('ul', { class: 'nav-panel-list' });
  [...ul.querySelectorAll(':scope > li')].forEach((li) => {
    const a = li.querySelector('a');
    if (a) list.append(linkItem(a));
  });
  return list;
}

/** Brand: logo link + site link(s). */
function buildBrand(section) {
  const brand = el('div', { class: 'nav-brand' });
  section.querySelectorAll('a').forEach((a) => {
    const link = a.cloneNode(true);
    const img = link.querySelector('img');
    if (img) {
      img.loading = 'eager';
      link.className = 'nav-logo';
      link.setAttribute('aria-label', img.alt || link.textContent.trim());
    } else {
      link.className = 'nav-site';
    }
    brand.append(link);
  });
  return brand;
}

/** Contextual nav: links and dropdowns from a nested list, plus an overflow menu. */
function buildSections(section, mobileLinks) {
  const sections = el('div', { class: 'nav-sections' });
  const list = el('ul', { class: 'nav-list' });
  mobileLinks.forEach((a) => {
    const item = linkItem(a);
    item.classList.add('nav-mobile-only');
    list.append(item);
  });
  const topList = section.querySelector(':scope > ul');
  [...(topList?.children || [])].forEach((li) => {
    const sub = li.querySelector(':scope > ul');
    const label = li.querySelector(':scope > p, :scope > a') || li;
    if (sub) {
      const panel = el('div', { class: 'nav-panel nav-dropdown' }, panelList(sub));
      const item = disclosure(label.textContent.trim(), panel, 'nav-menu', true);
      item.dataset.navOrder = list.children.length;
      list.append(item);
    } else {
      const a = li.querySelector('a');
      if (!a) return;
      const item = linkItem(a);
      item.dataset.navOrder = list.children.length;
      list.append(item);
    }
  });
  const moreLabel = [...section.querySelectorAll(':scope > p')].pop()?.textContent.trim();
  if (moreLabel) {
    const panel = el('div', { class: 'nav-panel nav-dropdown' }, el('ul', { class: 'nav-panel-list' }));
    const more = disclosure(moreLabel, panel, 'nav-more', true);
    more.hidden = true;
    list.append(more);
  }
  sections.append(list);
  return sections;
}

/** Global megamenu: label, top row, headed columns (accordions on mobile), footer link. */
function buildMegamenu(section) {
  const children = [...section.children];
  const label = children.find((c) => c.tagName === 'P' && !c.querySelector('a, strong'));
  const topRow = children.find((c) => c.tagName === 'UL');
  const columns = el('div', { class: 'nav-mega-columns' });
  children.forEach((c, i) => {
    const title = c.tagName === 'P' ? c.querySelector('strong') : null;
    const next = children[i + 1];
    if (title && next?.tagName === 'UL') {
      const list = panelList(next);
      const button = el('button', { type: 'button', class: 'nav-mega-title' }, el('span', {}, title.textContent.trim()));
      wireToggle(button, list);
      columns.append(el('div', { class: 'nav-mega-column' }, button, list));
    }
  });
  const footerLink = children.filter((c) => c.tagName === 'P' && c.querySelector('a')).pop()?.querySelector('a');
  const panel = el(
    'div',
    { class: 'nav-panel nav-mega' },
    topRow ? el('div', { class: 'nav-mega-top' }, panelList(topRow)) : null,
    columns,
    footerLink ? el('div', { class: 'nav-mega-footer' }, footerLink.cloneNode(true)) : null,
  );
  return el('ul', { class: 'nav-list nav-global' }, disclosure(label?.textContent.trim() || '', panel, 'nav-menu nav-menu-mega', true));
}

/** Tools: search (opens an inline search form) and account links. */
function buildTools(section, nav) {
  const tools = el('div', { class: 'nav-tools' });
  const paras = [...section.querySelectorAll(':scope > p')];
  const [searchPara, placeholderPara, cancelPara, ...accountParas] = paras;
  const searchLink = searchPara?.querySelector('a');
  if (searchLink) {
    const label = searchLink.textContent.trim();
    const open = el('button', {
      type: 'button', class: 'nav-search-toggle', 'aria-expanded': 'false', 'aria-label': label,
    }, el('span', {}, label));
    const input = el('input', {
      type: 'search', name: 'q', class: 'nav-search-input', placeholder: placeholderPara?.textContent.trim() || '', 'aria-label': label, autocomplete: 'off',
    });
    const submit = el('button', { type: 'submit', class: 'nav-search-submit', 'aria-label': label });
    const cancel = el('button', { type: 'button', class: 'nav-search-cancel' }, el('span', { class: 'nav-label' }, cancelPara?.textContent.trim() || ''));
    const form = el('form', {
      class: 'nav-search-form', role: 'search', action: searchLink.href, method: 'get',
    }, el('div', { class: 'nav-search-field' }, input, submit), cancel);
    form.hidden = true;
    const setOpen = (state) => {
      if (state) closeAll(nav);
      nav.classList.toggle('search-open', state);
      form.hidden = !state;
      open.setAttribute('aria-expanded', String(state));
      (state ? input : open).focus();
    };
    open.addEventListener('click', () => setOpen(true));
    cancel.addEventListener('click', () => setOpen(false));
    form.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    form.addEventListener('submit', (e) => { if (!input.value.trim()) e.preventDefault(); });
    tools.append(open);
    nav.append(form);
  }
  const account = el('div', { class: 'nav-account' });
  accountParas.forEach((p, i) => {
    const a = p.querySelector('a');
    if (!a) return;
    const link = a.cloneNode(true);
    link.className = i === 0 ? 'nav-signin' : 'nav-avatar';
    account.append(link);
  });
  if (account.children.length) tools.append(account);
  return tools;
}

/**
 * Moves contextual items that don't fit the bar into the overflow menu (desktop only).
 * @param {Element} nav Header nav
 */
function fitOverflow(nav) {
  const list = nav.querySelector('.nav-sections > .nav-list');
  const more = list?.querySelector('.nav-more');
  if (!more) return;
  const moreList = more.querySelector('.nav-panel-list');
  // restore every item to the bar in its original order
  const items = [...nav.querySelectorAll('[data-nav-order]')].sort((a, b) => a.dataset.navOrder - b.dataset.navOrder);
  items.forEach((item) => list.insertBefore(item, more));
  more.hidden = true;
  if (!isDesktop.matches) return;
  const sections = nav.querySelector('.nav-sections');
  // like the source, keep room for the overflow trigger before deciding everything fits
  more.hidden = false;
  const reserve = more.offsetWidth + (parseFloat(getComputedStyle(list).columnGap) || 0);
  more.hidden = true;
  const fits = () => list.scrollWidth + (more.hidden ? reserve : 0) <= sections.clientWidth;
  if (fits()) return;
  more.hidden = false;
  const inBar = items.slice();
  while (!fits() && inBar.length > 1) {
    const item = inBar.pop();
    moreList.prepend(item);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';
  if (!fragment) return;
  const [brandSec, contextSec, globalSec, toolsSec, mobileSec] = [...fragment.doc.children].filter((c) => c.tagName === 'DIV');

  const nav = el('nav', { id: 'nav', 'aria-expanded': 'false', 'aria-label': 'Main' });
  const bar = el('div', { class: 'nav-bar' });
  const brand = brandSec ? buildBrand(brandSec) : null;
  const menus = el('div', { class: 'nav-menus' });
  const sections = contextSec ? buildSections(contextSec, [...(mobileSec?.querySelectorAll('a') || [])]) : null;
  const right = el('div', { class: 'nav-right' });
  const mega = globalSec ? buildMegamenu(globalSec) : null;
  if (mega) right.append(mega);
  if (toolsSec) right.append(buildTools(toolsSec, nav));

  // mobile: hamburger opens the global menu, the site-name row opens the contextual nav
  const hamburger = el('div', { class: 'nav-hamburger' });
  const megaButton = mega?.querySelector('.nav-trigger');
  if (megaButton) {
    const button = el('button', {
      type: 'button', 'aria-controls': megaButton.getAttribute('aria-controls'), 'aria-expanded': 'false', 'aria-label': megaButton.textContent.trim(),
    }, el('span', { class: 'nav-hamburger-icon' }));
    button.addEventListener('click', () => megaButton.click());
    hamburger.append(button);
  }
  let discover = null;
  const siteLink = brand?.querySelector('.nav-site');
  if (sections && siteLink) {
    discover = el('button', { type: 'button', class: 'nav-discover' }, el('span', {}, siteLink.textContent.trim()));
    discover.dataset.topLevel = '';
    wireToggle(discover, sections);
  }

  if (brand) bar.append(brand);
  if (sections) menus.append(sections);
  menus.append(right);
  bar.append(hamburger, menus);
  if (discover) bar.append(discover);
  nav.prepend(bar);

  // close panels on outside click and Escape
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAll(nav);
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = [...nav.querySelectorAll('[data-top-level][aria-expanded="true"]')].pop();
    if (!open) return;
    closeAll(nav);
    (open.closest('.nav-menu-mega') && !isDesktop.matches ? hamburger.querySelector('button') : open).focus();
  });

  const wrapper = el('div', { class: 'nav-wrapper' }, nav);
  block.append(wrapper);

  // the contextual nav is a panel on mobile but always shown in the desktop bar
  const applyMode = () => {
    closeAll(nav);
    nav.classList.remove('search-open');
    nav.querySelector('.nav-search-form')?.setAttribute('hidden', '');
    if (sections) sections.hidden = !isDesktop.matches;
    if (discover) discover.setAttribute('aria-expanded', 'false');
    nav.querySelectorAll('.nav-mega-title').forEach((title) => {
      title.disabled = isDesktop.matches;
      setExpanded(title, isDesktop.matches);
    });
    fitOverflow(nav);
  };
  applyMode();
  isDesktop.addEventListener('change', applyMode);
  new ResizeObserver(() => fitOverflow(nav)).observe(wrapper);
  // fonts change text widths; refit once they're in
  document.fonts?.ready.then(() => fitOverflow(nav));
}
