// @ts-check
// Calls to `court.py serve`. Paths are relative so the page works under any host:port it is served on.
import { app } from "../core/state.js";

/** @returns {Promise<import("../types.js").CourtData>} */
export async function fetchState() {
  const r = await fetch("api/state" + (app.run ? "?run=" + encodeURIComponent(app.run) : ""), { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/** Every trial in .court/, newest first. @returns {Promise<any[]>} */
export async function fetchTrials() {
  const r = await fetch("api/trials", { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/** One trial's full record. @param {string} run @returns {Promise<import("../types.js").CourtData>} */
export async function fetchTrial(run) {
  const r = await fetch("api/state?run=" + encodeURIComponent(run), { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/**
 * POST JSON with the page token (and the trial being viewed, if it is not the latest). Throws the server's Korean error message on failure.
 * @param {string} path @param {object} body @param {string} fallback  message if the server gave none
 * @returns {Promise<any>}
 */
export async function postJSON(path, body, fallback) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Court-Token": app.token },
    body: JSON.stringify(app.run ? Object.assign({ run: app.run }, body) : body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || fallback);
  return j;
}
