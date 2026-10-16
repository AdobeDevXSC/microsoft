/*
 * Scrolling Slides (story)
 * Full-bleed pinned video stage with a column of expandable story panels.
 * One row per story: media cell (optional poster + desktop/mobile MP4 links)
 * | text cell (H2 + text).
 * Desktop: the stage is sticky; one scroll "trigger" per story opens its panel and crossfades
 * its video in. Inactive videos are paused.
 * Mobile: stories stack (media, then text), every panel open, nothing pinned.
 * Never measures layout: activation comes from IntersectionObserver only, so the block can be
 * decorated while detached (lazy fragments).
 */

import { createOptimizedPicture } from '../../scripts/images.js';
import { buildVideo, isVideoLink, pauseVideos } from '../../scripts/video.js';

const PINNED = window.matchMedia('(width >= 900px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
let uid = 0;

function isMediaCell(cell) {
  return !cell.querySelector('h1, h2, h3, h4, h5, h6')
    && Boolean(cell.querySelector('picture, img') || [...cell.querySelectorAll('a')].some(isVideoLink));
}

function splitCells(row) {
  const cells = [...row.children];
  const media = cells.find(isMediaCell) || document.createElement('div');
  const text = cells.find((cell) => cell !== media && cell.textContent.trim())
    || document.createElement('div');
  return { media, text };
}

function buildMedia(cell) {
  cell.className = 'scrolling-slides-story-media';
  if (buildVideo(cell, { loop: true, autoplay: true, controls: true })) return;
  const img = cell.querySelector('img');
  if (!img) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'video-media';
  wrapper.append(createOptimizedPicture(img.src, img.alt, false, [{ width: '2000' }]));
  cell.replaceChildren(wrapper);
}

function buildPanel(text, index, id) {
  const panel = document.createElement('div');
  panel.className = 'scrolling-slides-story-panel';
  const heading = text.querySelector('h1, h2, h3, h4, h5, h6');
  const body = document.createElement('div');
  body.className = 'scrolling-slides-story-body';
  body.id = `${id}-body-${index}`;
  const inner = document.createElement('div');
  inner.className = 'scrolling-slides-story-body-inner';
  inner.append(...[...text.childNodes].filter((node) => node !== heading));
  body.append(inner);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scrolling-slides-story-toggle';
  button.setAttribute('aria-controls', body.id);
  if (heading) {
    button.append(...heading.childNodes);
    heading.replaceChildren(button);
    heading.classList.add('scrolling-slides-story-heading');
    panel.append(heading);
  } else {
    button.textContent = `Story ${index + 1}`;
    panel.append(button);
  }
  panel.append(body);
  return { panel, button };
}

function syncVideos(stories, active) {
  stories.forEach(({ media }, i) => {
    const video = media.querySelector('video');
    if (!video) return;
    const isActive = !PINNED.matches || i === active;
    video.dataset.autoplay = isActive;
    if (!isActive) {
      pauseVideos(media);
    } else if (PINNED.matches && media.isConnected && !REDUCED_MOTION.matches
      && video.dataset.userPaused !== 'true') {
      video.play().catch(() => {});
    }
  });
}

export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.textContent.trim()
    || row.querySelector('picture, img'));
  if (!rows.length) return;
  uid += 1;
  const id = `scrolling-slides-story-${uid}`;

  const track = document.createElement('div');
  track.className = 'scrolling-slides-story-track';
  const stage = document.createElement('div');
  stage.className = 'scrolling-slides-story-stage';
  const layers = document.createElement('div');
  layers.className = 'scrolling-slides-story-layers';
  const panels = document.createElement('div');
  panels.className = 'scrolling-slides-story-panels';
  const triggers = document.createElement('div');
  triggers.className = 'scrolling-slides-story-triggers';
  triggers.setAttribute('aria-hidden', 'true');

  const stories = rows.map((row, i) => {
    const { media, text } = splitCells(row);
    buildMedia(media);
    media.style.order = i * 2;
    layers.append(media);

    const { panel, button } = buildPanel(text, i, id);
    panel.style.order = i * 2 + 1;
    panels.append(panel);

    const trigger = document.createElement('div');
    trigger.className = 'scrolling-slides-story-trigger';
    trigger.dataset.index = i;
    triggers.append(trigger);

    button.addEventListener('click', () => {
      const behavior = REDUCED_MOTION.matches ? 'auto' : 'smooth';
      (PINNED.matches ? trigger : panel).scrollIntoView({ behavior, block: 'start' });
    });
    return {
      media, panel, button, trigger,
    };
  });

  let active = -1;
  const activate = (index) => {
    if (index === active) return;
    active = index;
    stories.forEach(({ media, panel, button }, i) => {
      const open = !PINNED.matches || i === index;
      media.classList.toggle('is-active', i === index);
      panel.classList.toggle('is-active', i === index);
      button.setAttribute('aria-expanded', open);
    });
    syncVideos(stories, active);
  };

  stage.append(layers, panels);
  track.append(stage, triggers);
  track.style.setProperty('--story-count', stories.length);
  block.replaceChildren(track);
  activate(0);

  // a trigger crossing the middle of the viewport activates its story
  const observer = new IntersectionObserver((items) => {
    items.forEach((item) => {
      if (item.isIntersecting) activate(Number(item.target.dataset.index));
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  stories.forEach(({ trigger }) => observer.observe(trigger));

  PINNED.addEventListener('change', () => {
    const current = active;
    active = -1;
    activate(current);
  });
}
