/*
 * Buy Bar
 * Floating "buy" pill: product name, price and a call to action, fixed to the bottom of the
 * viewport. Hidden while the page's first section (the hero, which has its own buy box) is in
 * view and while the footer is in view; shown in between.
 * Content: one row with product name | price | CTA link (cells or paragraphs, any order:
 * the link is the CTA, text that looks like a price is the price, the rest is the name).
 * Hidden state is inert, so the bar is never focusable while invisible.
 */

const PRICE = /[$€£¥]\s?\d[\d.,]*|\d[\d.,]*\s?[$€£¥]/;

/**
 * Collects text pieces and the CTA from the authored content.
 * @param {Element} block The block
 * @returns {{name: string, price: string, cta: HTMLAnchorElement|null}}
 */
function readContent(block) {
  const cta = block.querySelector('a[href]');
  const pieces = [];
  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    const parts = cell.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
    (parts.length ? [...parts] : [cell]).forEach((part) => {
      if (cta && part.contains(cta)) return;
      const text = part.textContent.replace(/\s+/g, ' ').trim();
      if (text) pieces.push(text);
    });
  });
  const priceIndex = pieces.findIndex((text) => PRICE.test(text));
  const price = priceIndex >= 0 ? pieces.splice(priceIndex, 1)[0] : '';
  return { name: pieces.join(' '), price, cta };
}

export default function decorate(block) {
  const { name, price, cta } = readContent(block);

  const bar = document.createElement('div');
  bar.className = 'buy-bar-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', name ? `Buy ${name}` : 'Buy');

  const info = document.createElement('div');
  info.className = 'buy-bar-info';
  if (name) {
    const el = document.createElement('p');
    el.className = 'buy-bar-name';
    el.textContent = name;
    info.append(el);
  }
  if (price) {
    const el = document.createElement('p');
    el.className = 'buy-bar-price';
    el.textContent = price;
    info.append(el);
  }
  if (info.children.length) bar.append(info);

  if (cta) {
    cta.classList.add('buy-bar-cta');
    if (name && !cta.getAttribute('aria-label')) {
      cta.setAttribute('aria-label', `${cta.textContent.trim()} ${name}`);
    }
    bar.append(cta);
  }
  block.replaceChildren(bar);
  if (!bar.children.length) return;

  // hidden until we know the hero is out of view
  block.inert = true;
  const state = { hero: true, footer: false };
  const update = () => {
    const visible = !state.hero && !state.footer;
    block.classList.toggle('is-visible', visible);
    block.inert = !visible;
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target.matches('footer')) state.footer = entry.isIntersecting;
      else state.hero = entry.isIntersecting;
    });
    update();
  });

  const start = () => {
    const main = block.closest('main') || document.querySelector('main');
    // the hero is the first section with content besides this bar (the bar may sit inside it)
    const hero = [...(main?.children || [])].find((section) => !section.contains(block)
      || [...section.children].some((child) => !child.contains(block)));
    if (hero) observer.observe(hero);
    else state.hero = false;
    const footer = document.querySelector('body > footer');
    if (footer) observer.observe(footer);
    update();
  };
  // decorate may run before the block is attached; look up hero/footer afterwards
  setTimeout(start, 0);
}
