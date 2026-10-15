/*
 * Shared video helper
 * Authors place a poster image next to one or two MP4 links (desktop first, mobile second).
 * The links become a muted inline <video> that plays only while on screen.
 * Markup: .video-media > picture + video + button.video-toggle; .is-playing once frames render.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let observer;

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver((items) => {
      items.forEach(({ target, isIntersecting }) => {
        if (!target.isConnected) return;
        if (!target.dataset.src) {
          // first time in view: attach sources so nothing downloads before then
          target.querySelectorAll('source[data-src]').forEach((source) => {
            source.src = source.dataset.src;
            source.removeAttribute('data-src');
          });
          target.dataset.src = 'loaded';
          target.load();
        }
        const paused = target.dataset.userPaused === 'true';
        if (isIntersecting && !paused && !reducedMotion.matches && target.dataset.autoplay !== 'false') {
          target.play().catch(() => {});
        } else {
          target.pause();
        }
      });
    }, { threshold: 0.25 });
  }
  return observer;
}

/**
 * Tells whether a link points to a video file.
 * @param {HTMLAnchorElement} a The link
 * @returns {boolean}
 */
export function isVideoLink(a) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(a?.href || '');
}

/**
 * Builds a video from poster + MP4 links found in a container, replacing them.
 * @param {Element} container Element holding the poster picture/img and video link(s)
 * @param {Object} [options]
 * @param {boolean} [options.loop=true] Loop playback
 * @param {boolean} [options.autoplay=true] Play while in view
 * @param {boolean} [options.controls=true] Add a play/pause toggle
 * @returns {HTMLVideoElement|null} The video, or null when no video link is present
 */
export function buildVideo(container, { loop = true, autoplay = true, controls = true } = {}) {
  const links = [...container.querySelectorAll('a')].filter(isVideoLink);
  if (!links.length) return null;

  const picture = container.querySelector('picture');
  const img = picture?.querySelector('img') || container.querySelector('img');
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = loop;
  video.preload = 'none';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.dataset.autoplay = autoplay;
  // the authored image stays as the poster layer (keeps LCP/lazy loading on the image)
  if (img?.alt) video.setAttribute('aria-label', img.alt);
  else video.setAttribute('aria-hidden', 'true');

  const [desktop, mobile] = links;
  if (mobile) {
    const source = document.createElement('source');
    source.dataset.src = mobile.href;
    source.type = 'video/mp4';
    source.media = '(width < 900px)';
    video.append(source);
  }
  const source = document.createElement('source');
  source.dataset.src = desktop.href;
  source.type = 'video/mp4';
  video.append(source);

  const wrapper = document.createElement('div');
  wrapper.className = 'video-media';
  const poster = picture || img;
  const posterP = poster?.closest('p');
  if (poster) wrapper.append(poster);
  if (posterP && !posterP.textContent.trim() && !posterP.children.length) posterP.remove();
  wrapper.append(video);
  video.addEventListener('playing', () => wrapper.classList.add('is-playing'), { once: true });

  if (controls) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-toggle';
    const update = () => {
      const playing = !video.paused;
      button.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
      button.dataset.state = playing ? 'playing' : 'paused';
    };
    button.addEventListener('click', () => {
      if (video.paused) {
        video.dataset.userPaused = 'false';
        video.play().catch(() => {});
      } else {
        video.dataset.userPaused = 'true';
        video.pause();
      }
    });
    video.addEventListener('play', update);
    video.addEventListener('pause', update);
    update();
    wrapper.append(button);
  }

  // remove the authored links (and their now-empty paragraphs)
  links.forEach((el) => {
    const p = el?.closest('p');
    el?.remove();
    if (p && !p.textContent.trim() && !p.children.length) p.remove();
  });
  container.prepend(wrapper);
  getObserver().observe(video);
  return video;
}

/**
 * Pauses every video inside an element (e.g. an inactive tab or slide).
 * @param {Element} el Container
 */
export function pauseVideos(el) {
  el.querySelectorAll('video').forEach((v) => v.pause());
}
