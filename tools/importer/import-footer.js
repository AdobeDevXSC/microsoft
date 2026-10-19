/* eslint-disable */
/* global WebImporter */

// Builds the site footer document (/footer) from the Microsoft UHF footer on a source page.
// Flat, semantic sections only (no classes/ids/forms) so it round-trips through DA:
//   1. link columns: per group a bold title paragraph followed by its link list
//   2. base: locale link, privacy links (the privacy-choices icon as an image), the legal
//      link list, and the copyright line

const PRIVACY_ICON_PATH = 'images/privacy-choices.svg';
const HANDOFF_ID = 'eds-footer-import';

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

function columnsSection(document, footer) {
  const div = document.createElement('div');
  footer.querySelectorAll('uhf-footer-nav-group').forEach((group) => {
    const strong = document.createElement('strong');
    strong.textContent = text(group.querySelector('h2, [class*="heading"]'));
    div.append(para(document, strong));
    div.append(linkList(document, [...group.querySelectorAll('ul a')]));
  });
  return div;
}

function baseSection(document, footer) {
  const div = document.createElement('div');
  const base = footer.querySelector('.uhf-footer-base');
  // locale, privacy choices, health privacy (left group)
  base.querySelectorAll('.uhf-footer-legal-links a').forEach((a) => {
    const svg = a.querySelector('svg');
    if (svg) {
      const out = document.createElement('a');
      out.href = a.href;
      const img = document.createElement('img');
      img.src = PRIVACY_ICON_PATH;
      img.alt = text(svg.querySelector('title')) || '';
      out.append(img, ` ${[...a.childNodes].filter((n) => n.nodeName !== 'svg').map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim()}`);
      div.append(para(document, out));
    } else {
      div.append(para(document, link(document, a.href, text(a))));
    }
  });
  // legal menu + copyright
  const menu = base.querySelector('nav.uhf-footer-menu');
  // only links the source actually shows (consent-only links like "Manage cookies" stay hidden in the US)
  div.append(linkList(document, [...menu.querySelectorAll('a')].filter((a) => a.getClientRects().length > 0)));
  const copyright = [...menu.querySelectorAll('li')].find((li) => !li.querySelector('a'));
  if (copyright) div.append(para(document, text(copyright)));
  return div;
}

// The importer strips <footer> before transform(), so the document is built in onLoad
// (while the live footer exists) and handed over via a hidden placeholder element.
export default {
  onLoad: async ({ document }) => {
    const ready = () => document.querySelector('uhf-footer-nav-group ul a') && document.querySelector('.uhf-footer-base nav a');
    for (let i = 0; i < 40 && !ready(); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { setTimeout(r, 250); });
    }
    const footer = document.querySelector('footer.uhf-footer');
    const out = document.createElement('div');
    out.id = HANDOFF_ID;
    out.hidden = true;
    out.append(columnsSection(document, footer), baseSection(document, footer));
    document.body.append(out);
  },
  transform: ({ document }) => {
    const handoff = document.getElementById(HANDOFF_ID);
    const main = document.createElement('div');
    [...handoff.children].forEach((section, i) => {
      if (i) main.append(document.createElement('hr'));
      main.append(...section.childNodes);
    });
    handoff.remove();
    return [{ element: main, path: '/footer', report: { title: 'footer', template: 'footer' } }];
  },
};
