// @ts-check
// On touch screens, swipe left anywhere on the page for the next scene (like → on a keyboard).
import { step } from "../player/player.js";

const swipe = { x: 0, y: 0, active: false };

/** @param {EventTarget | null} t */
function ignoresSwipe(t) {
  return t instanceof Element && !!t.closest("input, textarea, select, dialog, .ask");
}

export function setupSwipe() {
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || ignoresSwipe(e.target)) { swipe.active = false; return; }
    swipe.active = true;
    swipe.x = e.touches[0].clientX;
    swipe.y = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!swipe.active) return;
    swipe.active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
    // A clear leftward move, not a scroll that drifted sideways.
    if (dx < -60 && Math.abs(dy) < Math.abs(dx) * 0.5) step(true);
  }, { passive: true });
}
