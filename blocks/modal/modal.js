/*
 * Modal Block
 * Opens a fragment in a native dialog. Links to `/modals/...` pages open automatically
 * (see autolinkModals in scripts/scripts.js); the fragment is fetched on first click.
 * https://www.aem.live/developer/block-collection/modal
 */

import { loadFragment } from '../fragment/fragment.js';
import { buildBlock, decorateBlock, loadBlock } from '../../scripts/aem.js';

/**
 * Creates a modal around the given content.
 * @param {Node[]} contentNodes Content to show
 * @returns {Promise<{block: Element, showModal: Function}>}
 */
export async function createModal(contentNodes) {
  const dialog = document.createElement('dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.addEventListener('click', () => dialog.close());
  dialog.prepend(closeButton);

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  // close on backdrop click
  dialog.addEventListener('click', (e) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    block.remove();
  });

  block.innerHTML = '';
  block.append(dialog);

  return {
    block,
    showModal: () => {
      dialog.showModal();
      dialogContent.scrollTop = 0;
      document.body.classList.add('modal-open');
    },
  };
}

/**
 * Loads a fragment and shows it in a modal.
 * @param {string} fragmentUrl Path of the modal page
 */
export async function openModal(fragmentUrl) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;
  const fragment = await loadFragment(path);
  if (!fragment) {
    window.location.href = path;
    return;
  }
  const { showModal } = await createModal(fragment.childNodes);
  showModal();
}
