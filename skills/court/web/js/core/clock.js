// @ts-check
// Replay timing: playback speed and the timers that drive the current scene.
import { SPEEDS, WALK_MS } from "./constants.js";

export const reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

/** @type {{speed: number, timers: number[]}} */
export const clock = { speed: 1, timers: [] };

/**
 * Run `fn` after `ms`; cancelled by clearTimers().
 * @param {() => void} fn
 * @param {number} ms
 */
export function later(fn, ms) {
  clock.timers.push(window.setTimeout(fn, ms));
}

export function clearTimers() {
  clock.timers.forEach(clearTimeout);
  clock.timers = [];
}

/** How long a walk takes at the current speed. */
export function walkMs() {
  return reduced ? 0 : WALK_MS / clock.speed;
}

/** The speed after the current one, wrapping around. */
export function nextSpeed() {
  return SPEEDS[(SPEEDS.indexOf(clock.speed) + 1) % SPEEDS.length];
}
