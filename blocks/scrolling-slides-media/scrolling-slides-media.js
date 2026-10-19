/*
 * Scrolling Slides (media)
 * Pinned media slides that switch as the visitor scrolls.
 * One row per slide: media cell (poster + desktop/mobile MP4 links) | text cell (H2 + paragraph).
 * All widths: the stage is sticky and one scroll "trigger" per slide decides the active slide
 * (layout differs per breakpoint in CSS only: text on top below 900px, bottom-left above).
 * Never measures layout: activation comes from IntersectionObserver only, so the block can be
 * decorated while detached (lazy fragments).
 */

import { buildVideo, pauseVideos } from '../../scripts/video.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

function splitCells(row) {
  const cells = [...row.children];
  let media = cells.find((cell) => cell.querySelector('picture, img, a[href]')
    && !cell.querySelector('h1, h2, h3, h4, h5, h6'));
  let text = cells.find((cell) => cell !== media);
  if (!media && cells.length > 1) [media] = cells;
  if (!text) text = document.createElement('div');
  if (!media) media = document.createElement('div');
  return { media, text };
}

function syncVideos(slides, active) {
  slides.forEach((slide, i) => {
    const video = slide.querySelector('video');
    if (!video) return;
    const isActive = i === active;
    video.dataset.autoplay = isActive;
    if (!isActive) {
      pauseVideos(slide);
    } else if (slide.isConnected && !REDUCED_MOTION.matches
      && video.dataset.userPaused !== 'true') {
      video.play().catch(() => {});
    }
  });
}

export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.children.length);
  if (!rows.length) return;

  const track = document.createElement('div');
  track.className = 'scrolling-slides-media-track';
  const stage = document.createElement('div');
  stage.className = 'scrolling-slides-media-stage';
  const triggers = document.createElement('div');
  triggers.className = 'scrolling-slides-media-triggers';
  triggers.setAttribute('aria-hidden', 'true');
  const nav = document.createElement('div');
  nav.className = 'scrolling-slides-media-nav';
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Slides');

  const slides = rows.map((row, i) => {
    const { media, text } = splitCells(row);
    const slide = document.createElement('div');
    slide.className = 'scrolling-slides-media-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${rows.length}`);

    media.className = 'scrolling-slides-media-media';
    if (!buildVideo(media, { loop: true, autoplay: true, controls: true })) {
      const picture = media.querySelector('picture, img');
      if (picture) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-media';
        wrapper.append(picture);
        media.replaceChildren(wrapper);
      }
    }
    text.className = 'scrolling-slides-media-text';
    slide.append(media, text);

    const trigger = document.createElement('div');
    trigger.className = 'scrolling-slides-media-trigger';
    trigger.dataset.index = i;
    triggers.append(trigger);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scrolling-slides-media-dot';
    const heading = text.querySelector('h1, h2, h3, h4, h5, h6');
    button.setAttribute('aria-label', heading?.textContent.trim() || `Slide ${i + 1}`);
    button.addEventListener('click', () => {
      const behavior = REDUCED_MOTION.matches ? 'auto' : 'smooth';
      trigger.scrollIntoView({ behavior, block: 'start' });
    });
    nav.append(button);
    return slide;
  });

  let active = -1;
  const activate = (index) => {
    if (index === active) return;
    active = index;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      nav.children[i].setAttribute('aria-current', i === index ? 'true' : 'false');
    });
    syncVideos(slides, active);
  };

  const frame = document.createElement('div');
  frame.className = 'scrolling-slides-media-frame';
  frame.append(...slides);
  if (slides.length > 1) frame.append(nav);
  stage.append(frame);
  track.append(stage, triggers);
  track.style.setProperty('--slide-count', slides.length);
  block.replaceChildren(track);
  activate(0);

  // a trigger crossing the middle of the viewport activates its slide
  const observer = new IntersectionObserver((items) => {
    items.forEach((item) => {
      if (item.isIntersecting) activate(Number(item.target.dataset.index));
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  [...triggers.children].forEach((trigger) => observer.observe(trigger));
}
