// @ts-check
// Small DOM helpers.

/**
 * The element matching `sel`. The page markup is fixed, so a miss is a bug.
 * @param {string} sel
 * @returns {any}
 */
export function $(sel) {
  const el = document.querySelector(sel);
  if (!el) throw new Error("court: missing " + sel);
  return el;
}

/**
 * Remove and re-add a class so its animation plays again.
 * @param {HTMLElement} el
 * @param {string} cls
 */
export function replayAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
