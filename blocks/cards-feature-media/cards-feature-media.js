/*
 * Cards (feature media)
 * Bento grid of feature cards.
 * One row per card: media cell (image, or poster + MP4 links) | text cell.
 * Text renders above the media; layout (tall first card, horizontal third card) is CSS only.
 */

import { createOptimizedPicture } from '../../scripts/images.js';
import { buildVideo, isVideoLink } from '../../scripts/video.js';

function isMediaCell(cell) {
  const hasMedia = cell.querySelector('picture, img') || [...cell.querySelectorAll('a')].some(isVideoLink);
  const text = [...cell.querySelectorAll('a')].filter(isVideoLink)
    .reduce((t, a) => t.replace(a.textContent, ''), cell.textContent).trim();
  return Boolean(hasMedia) && !text;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.some((cell) => cell.textContent.trim() || cell.querySelector('picture, img'))) return;
    const li = document.createElement('li');
    li.className = 'cards-feature-media-card';
    const media = cells.filter(isMediaCell);
    const body = cells.filter((cell) => !media.includes(cell));

    body.forEach((cell) => {
      cell.className = 'cards-feature-media-card-body';
      li.append(cell);
    });
    media.forEach((cell) => {
      cell.className = 'cards-feature-media-card-media';
      if (!buildVideo(cell, { loop: true, autoplay: true, controls: true })) {
        cell.querySelectorAll('picture > img').forEach((img) => {
          img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
        });
      }
      li.append(cell);
    });
    if (!media.length) {
      // single-cell card: media authored inline with the text
      const cell = body.find((c) => [...c.querySelectorAll('a')].some(isVideoLink));
      const video = cell && buildVideo(cell, { loop: true, autoplay: true, controls: true });
      if (video) {
        const wrapper = video.closest('.video-media');
        const holder = document.createElement('div');
        holder.className = 'cards-feature-media-card-media';
        holder.append(wrapper);
        li.append(holder);
      } else {
        li.classList.add('no-media');
      }
    }
    ul.append(li);
  });
  block.replaceChildren(ul);
}
