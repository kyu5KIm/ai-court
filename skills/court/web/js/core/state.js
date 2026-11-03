// @ts-check
// State shared across modules. Kept in plain objects so any module can update a field.

/**
 * The trial data and connection state.
 * `run` is set when the page was opened as ?run=NAME to look at an older trial.
 * @type {{data: import("../types.js").CourtData, token: string, online: boolean, run: string}}
 */
export const app = { data: /** @type {any} */ (null), token: "", online: true, run: "" };

/**
 * The replay: the scene list, the next scene to play, and the scene being revealed.
 * @type {{scenes: import("../types.js").Scene[], idx: number, playing: boolean, cur: import("../types.js").Current | null}}
 */
export const player = { scenes: [], idx: 0, playing: false, cur: null };

/** The trial stopped before its end: an error, the user's stop button, or a server that went away. */
export function stoppedEarly() {
  const r = app.data.runner;
  return !!(r && !app.data.finished && ["error", "cancelled", "interrupted"].includes(r.status));
}

/** True while a live trial is still running, so more scenes will arrive. */
export function waitingForMore() {
  const d = app.data;
  return !!(d.live && !d.finished && !d.empty && !stoppedEarly());
}

/** Every scene has played and none are coming. */
export function isOver() {
  return player.idx >= player.scenes.length && !player.cur && !waitingForMore();
}
