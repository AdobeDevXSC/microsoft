/* eslint-disable */
/* global WebImporter */

// Builds the site nav document (/nav) from the Microsoft UHF header on a source page.
// Output is flat, semantic sections only (no classes/ids/forms) so it round-trips through DA:
//   1. brand: logo link + site brand link
//   2. contextual (Surface) nav: links and dropdowns (label + nested list), overflow items included
//   3. All Microsoft megamenu: label, top-row links, headed columns, footer link
//   4. tools: search link + its labels, sign-in link + avatar label

const SEARCH_URL = 'https://www.microsoft.com/en-us/search/explore';
const SIGN_IN_URL = 'https://login.live.com/login.srf';
const LOGO_PATH = 'images/microsoft-logo.png';

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

function link(document, href, label) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = label;
  return a;
}

function para(document, child) {
  const p = document.createElement('p');
  if (typeof child === 'string') p.textContent = child;
  else p.append(child);
  return p;
}

function linkList(document, anchors) {
  const ul = document.createElement('ul');
  anchors.forEach((a) => {
    const li = document.createElement('li');
    li.append(link(document, a.href, text(a)));
    ul.append(li);
  });
  return ul;
}

function brandSection(document, hdr) {
  const div = document.createElement('div');
  const brand = hdr.querySelector('uhf-brand');
  const [logoLink, siteLink] = [...brand.querySelectorAll('a')];
  const img = document.createElement('img');
  img.src = LOGO_PATH;
  img.alt = brand.querySelector('img')?.alt || 'Microsoft';
  const a = document.createElement('a');
  a.href = logoLink.href;
  a.append(img);
  div.append(para(document, a));
  if (siteLink) div.append(para(document, link(document, siteLink.href, text(siteLink))));
  return div;
}

function contextualSection(document, hdr) {
  const div = document.createElement('div');
  const ul = document.createElement('ul');
  const seen = new Set();
  const nav = hdr.querySelector('uhf-contextual-nav-desktop');
  const addItem = (el) => {
    if (el.matches('uhf-dropdown-desktop')) {
      const label = text(el.querySelector('button'));
      if (!label || label === 'More' || seen.has(label)) return;
      seen.add(label);
      const li = document.createElement('li');
      li.append(para(document, label));
      li.append(linkList(document, [...el.querySelectorAll('uhf-popout a')]));
      ul.append(li);
    } else if (el.matches('a')) {
      const label = text(el);
      if (!label || seen.has(label)) return;
      seen.add(label);
      const li = document.createElement('li');
      li.append(link(document, el.href, label));
      ul.append(li);
    }
  };
  // top-level items in source order, then anything the overflow ("More") menu holds
  nav.querySelectorAll('uhf-dropdown-desktop, a.uhf-nav-item').forEach((el) => {
    if (el.closest('uhf-popout') && !el.closest('uhf-overflow-menu')) return;
    if (el.matches('a') && el.closest('uhf-dropdown-desktop')) return;
    addItem(el);
  });
  const more = [...nav.querySelectorAll('uhf-dropdown-desktop')].find((d) => text(d.querySelector('button')) === 'More');
  if (more) more.querySelectorAll('uhf-popout a').forEach(addItem);
  div.append(ul);
  // label of the overflow menu that collects items that don't fit
  if (more) div.append(para(document, text(more.querySelector('button'))));
  return div;
}

function globalSection(document, hdr) {
  const div = document.createElement('div');
  const gn = hdr.querySelector('uhf-global-nav-desktop');
  div.append(para(document, text(gn.querySelector('button'))));
  const pop = gn.querySelector('uhf-popout');
  div.append(linkList(document, [...pop.querySelectorAll('uhf-dropdown-header a')]));
  pop.querySelectorAll('uhf-dropdown-column').forEach((col) => {
    const links = [...col.querySelectorAll('a')];
    const heading = [...col.children].map((c) => c).find((c) => !c.matches('a') && !c.querySelector('a') && text(c));
    // column titles are bold labels on the source (not headings)
    const strong = document.createElement('strong');
    strong.textContent = text(heading) || text(col).split(text(links[0]))[0].trim();
    div.append(para(document, strong));
    div.append(linkList(document, links));
  });
  const foot = pop.querySelector('uhf-dropdown-footer a');
  if (foot) div.append(para(document, link(document, foot.href, text(foot))));
  return div;
}

function toolsSection(document, hdr) {
  const div = document.createElement('div');
  const search = hdr.querySelector('uhf-search');
  const input = search?.querySelector('input');
  div.append(para(document, link(document, SEARCH_URL, text(search?.querySelector('button')) || 'Search')));
  div.append(para(document, input?.placeholder || 'Search or ask a question'));
  div.append(para(document, 'Cancel'));
  const me = hdr.querySelector('uhf-mecontrol');
  div.append(para(document, link(document, SIGN_IN_URL, text(me?.querySelector('.uhf-mecontrol-signin-label')) || 'Sign in')));
  div.append(para(document, link(document, SIGN_IN_URL, text(me?.querySelector('button')) || 'ME')));
  return div;
}

// The mobile header (rendered below ~860px) lists the site link as "Home" at the top of the
// "Discover Surface" menu; the importer runs at desktop width, so the label is set here.
const MOBILE_HOME_LABEL = 'Home';

function mobileSection(document, hdr) {
  const div = document.createElement('div');
  const siteLink = [...hdr.querySelectorAll('uhf-brand a')][1];
  if (siteLink) div.append(para(document, link(document, siteLink.href, MOBILE_HOME_LABEL)));
  return div;
}

// The importer strips <header> before transform(), so the nav is built in onLoad
// (while the live header exists) and handed over via a placeholder element.
const HANDOFF_ID = 'eds-nav-import';

export default {
  onLoad: async ({ document }) => {
    // UHF web components hydrate after load; wait for dropdown + megamenu content
    const ready = () => document.querySelector('uhf-contextual-nav-desktop uhf-popout a')
      && document.querySelector('uhf-global-nav-desktop uhf-dropdown-column a')
      && document.querySelector('uhf-brand a');
    for (let i = 0; i < 40 && !ready(); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { setTimeout(r, 250); });
    }
    const hdr = document.querySelector('.cge-uhf-header');
    const out = document.createElement('div');
    out.id = HANDOFF_ID;
    out.hidden = true;
    [brandSection, contextualSection, globalSection, toolsSection, mobileSection].forEach((build) => {
      out.append(build(document, hdr));
    });
    document.body.append(out);
  },
  transform: ({ document }) => {
    const handoff = document.getElementById(HANDOFF_ID);
    const main = document.createElement('div');
    // sections are separated by <hr> in the importer's document model
    [...handoff.children].forEach((section, i) => {
      if (i) main.append(document.createElement('hr'));
      main.append(...section.childNodes);
    });
    handoff.remove();
    return [{ element: main, path: '/nav', report: { title: 'nav', template: 'nav' } }];
  },
};
