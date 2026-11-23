/**
 * Wraps a drop-in initializer so it runs once (and again after prerender activation).
 * @param {Function} cb The initializer
 * @returns {Function} The guarded initializer
 */
export default function initializeDropin(cb) {
  let initialized = false;

  const init = async (force = false) => {
    if (initialized && !force) return;
    await cb();
    initialized = true;
  };

  document.addEventListener('prerenderingchange', () => init(true), { once: true });

  return init;
}
