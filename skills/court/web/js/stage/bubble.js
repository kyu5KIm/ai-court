// @ts-check
// The speech bubble above whoever is talking.
import { $ } from "../core/dom.js";

/** The last thing said, so the bubble can be re-placed when the window resizes. */
const speech = {
  /** @type {[import("../types.js").Character, string, import("../types.js").Tone] | null} */
  last: null,
};

/**
 * Show `text` above character `c`, or hide the bubble when `text` is empty.
 * Long text is cut to fit; the full text is in the transcript.
 * @param {import("../types.js").Character | null} c
 * @param {string} [text]
 * @param {import("../types.js").Tone} [tone]
 */
export function say(c, text, tone) {
  const bubble = $("#bubble"), tail = $("#tail"), scene = $("#scene");
  speech.last = c && text ? [c, text, tone || ""] : null;
  if (!c || !text) { bubble.classList.remove("on"); tail.classList.remove("on"); return; }
  const clean = text.replace(/\s+/g, " ").trim();
  const W = scene.clientWidth, max = W < 520 ? 44 : 84;
  bubble.textContent = clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
  bubble.className = "bubble on " + (tone || "");
  tail.className = "bubble-tail on " + (tone || "");

  const H = scene.clientHeight, S = c.el.offsetHeight;
  const x = c.pos.x / 100 * W, y = c.pos.y / 100 * H;
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  const left = Math.max(6, Math.min(W - bw - 6, x - bw / 2));
  let top = y - S - bh - 16;
  const below = top < 4;
  if (below) top = y + 10;
  bubble.style.left = left + "px";
  bubble.style.top = top + "px";
  tail.classList.toggle("up", below);
  tail.style.left = Math.max(left + 10, Math.min(left + bw - 22, x - 6)) + "px";
  tail.style.top = (below ? top - 6 : top + bh - 7) + "px";
}

/** Place the bubble again after a resize. */
export function resay() {
  if (speech.last) say(speech.last[0], speech.last[1], speech.last[2]);
}
