/*
 * Carousel (cards)
 * "Sneak peek" slider: the active card is centered, neighbours peek out behind it.
 * One row per slide: image cell | text cell (heading, text, optional link).
 * Prev/next buttons and dots; loops; arrow keys work when focus is inside.
 */
import { createOptimizedPicture } from '../../scripts/images.js';

let instance = 0;

export default function decorate(block) {
  instance += 1;
  const id = `carousel-cards-${instance}`;
  const rows = [...block.children].filter((r) => r.textContent.trim() || r.querySelector('picture, img'));

  const viewport = document.createElement('div');
  viewport.className = 'carousel-cards-viewport';
  const track = document.createElement('ul');
  track.className = 'carousel-cards-track';
  track.id = `${id}-track`;
  viewport.append(track);

  const slides = rows.map((row, i) => {
    const slide = document.createElement('li');
    slide.className = 'carousel-cards-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${rows.length}`);
    [...row.children].forEach((cell) => {
      const isImage = cell.querySelector('picture, img') && !cell.textContent.trim();
      if (isImage) {
        const img = cell.querySelector('img');
        cell.replaceChildren(createOptimizedPicture(img.src, img.alt, false, [{ width: '960' }]));
        cell.className = 'carousel-cards-image';
      } else if (cell.textContent.trim()) {
        cell.className = 'carousel-cards-body';
        cell.querySelectorAll('a:any-link').forEach((a) => {
          const p = a.closest('p');
          if (p && p.textContent.trim() === a.textContent.trim()) {
            a.classList.add('store-cta');
            p.classList.add('carousel-cards-link');
          }
        });
      } else return;
      slide.append(cell);
    });
    track.append(slide);
    return slide;
  });

  // looped peek: decorative copies of the last/first slide sit at either end of the track
  const clones = [];
  if (slides.length > 2) {
    const ghost = (slide) => {
      const c = slide.cloneNode(true);
      c.classList.add('carousel-cards-clone');
      c.removeAttribute('role');
      c.removeAttribute('aria-roledescription');
      c.removeAttribute('aria-label');
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      c.querySelectorAll('a, button').forEach((n) => { n.tabIndex = -1; });
      return c;
    };
    const head = ghost(slides[slides.length - 1]);
    const tail = ghost(slides[0]);
    track.prepend(head);
    track.append(tail);
    clones.push([head, slides.length - 1], [tail, 0]);
  }

  const status = document.createElement('p');
  status.className = 'carousel-cards-status';
  status.setAttribute('aria-live', 'polite');

  const button = (dir, label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `carousel-cards-${dir}`;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-controls', track.id);
    return b;
  };
  const prev = button('prev', 'Previous slide');
  const next = button('next', 'Next slide');

  const dots = document.createElement('div');
  dots.className = 'carousel-cards-dots';
  const dotButtons = slides.map((slide, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', `Show slide ${i + 1} of ${slides.length}`);
    dots.append(d);
    return d;
  });

  let current = 0;
  function update() {
    slides.forEach((s, i) => {
      const active = i === current;
      s.classList.toggle('active', active);
      s.setAttribute('aria-hidden', String(!active));
      s.querySelectorAll('a, button').forEach((el) => { el.tabIndex = active ? 0 : -1; });
    });
    dotButtons.forEach((d, i) => d.setAttribute('aria-current', String(i === current)));
    const slide = slides[current];
    if (slide) {
      const offset = viewport.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
      track.style.transform = `translateX(${offset}px)`;
      const title = slide.querySelector('h2, h3, h4')?.textContent.trim() || '';
      status.textContent = `Slide ${current + 1} of ${slides.length}. ${title}`;
    }
  }
  function go(i) {
    current = (i + slides.length) % slides.length;
    update();
  }

  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  dotButtons.forEach((d, i) => d.addEventListener('click', () => go(i)));
  slides.forEach((s, i) => s.addEventListener('click', (e) => {
    if (i !== current) { e.preventDefault(); go(i); }
  }));
  clones.forEach(([clone, i]) => clone.addEventListener('click', (e) => { e.preventDefault(); go(i); }));
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.replaceChildren(status, viewport, prev, next, dots);
  if (slides.length < 2) { prev.hidden = true; next.hidden = true; dots.hidden = true; }

  new ResizeObserver(() => update()).observe(viewport);
  update();
}
