/*
 * Footer block
 * Renders the footer fragment: link columns (title + list per group) and a base strip
 * (locale/privacy links, legal link list, copyright). All copy and links come from the
 * footer document; this file only adds structure and behaviour.
 */

/**
 * Fetches the footer fragment: local preview serves it under /content, DA/EDS at the root.
 * @returns {Promise<Element|null>}
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const doc = document.createElement('div');
  doc.innerHTML = await resp.text();
  // relative media paths are relative to the fragment, not the page
  doc.querySelectorAll('img[src], source[srcset]').forEach((media) => {
    const attr = media.hasAttribute('src') ? 'src' : 'srcset';
    const value = media.getAttribute(attr);
    if (value && !/^(https?:|\/|data:)/.test(value)) media.setAttribute(attr, new URL(value, resp.url).href);
  });
  return doc;
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

/** Link columns: each bold title paragraph + the list after it becomes a group. */
function buildColumns(section) {
  const columns = el('nav', { class: 'footer-columns', 'aria-label': 'Footer' });
  const children = [...section.children];
  children.forEach((c, i) => {
    const title = c.tagName === 'P' ? c.querySelector('strong') : null;
    const list = children[i + 1];
    if (!title || list?.tagName !== 'UL') return;
    const links = list.cloneNode(true);
    links.className = 'footer-group-links';
    columns.append(el('div', { class: 'footer-group' }, el('h2', { class: 'footer-group-title' }, title.textContent.trim()), links));
  });
  return columns;
}

/** Base strip: leading link paragraphs, then the legal list and the copyright line. */
function buildBase(section) {
  const base = el('div', { class: 'footer-base' });
  const lead = el('div', { class: 'footer-lead' });
  const menu = el('ul', { class: 'footer-menu' });
  [...section.children].forEach((c) => {
    if (c.tagName === 'UL') {
      [...c.children].forEach((li) => menu.append(li.cloneNode(true)));
    } else if (c.tagName === 'P' && c.querySelector('a')) {
      const a = c.querySelector('a').cloneNode(true);
      a.className = 'footer-lead-link';
      // the first lead link is the locale link; its globe icon sits beside it (CSS)
      lead.append(lead.children.length ? a : el('span', { class: 'footer-locale' }, a));
    } else if (c.tagName === 'P' && c.textContent.trim()) {
      menu.append(el('li', { class: 'footer-copyright' }, c.textContent.trim()));
    }
  });
  base.append(lead, el('nav', { class: 'footer-menu-nav', 'aria-label': 'Legal' }, menu));
  return base;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const doc = await fetchFooter();
  block.textContent = '';
  if (!doc) return;
  const [columnsSec, baseSec] = [...doc.children].filter((c) => c.tagName === 'DIV');
  const footer = el('div', { class: 'footer-inner' });
  if (columnsSec) footer.append(buildColumns(columnsSec));
  if (baseSec) footer.append(buildBase(baseSec));
  block.append(footer);
}
