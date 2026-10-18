// @ts-check
// One-off stage moments: juror vote signs, the score, the gavel and the verdict stamp.
import { $, replayAnimation } from "../core/dom.js";
import { later } from "../core/clock.js";
import { cast } from "./cast.js";
import { playSound } from "../ui/sound.js";

/**
 * A juror stops thinking and raises a vote sign.
 * @param {import("../types.js").Character} c @param {string} cls  g | n | "" @param {string} label
 * @param {boolean} instant  no hop
 */
export function raiseSign(c, cls, label, instant) {
  c.el.classList.remove("thinking");
  const sign = /** @type {HTMLElement} */ (c.el.querySelector(".sign"));
  sign.className = "sign " + cls;
  /** @type {HTMLElement} */ (sign.querySelector("b")).textContent = label;
  void sign.offsetWidth;
  sign.classList.add("on");
  if (!instant) { replayAnimation(c.el, "hop"); playSound("sign"); }
}

/** @param {number} guilty @param {number} notGuilty @param {boolean} animate */
export function setScore(guilty, notGuilty, animate) {
  for (const [sel, n] of /** @type {[string, number][]} */ ([["#sg", guilty], ["#sn", notGuilty]])) {
    const el = $(sel);
    if (animate && el.textContent !== String(n)) replayAnimation(el, "bump");
    el.textContent = n;
  }
}

/**
 * The gavel falls, the room shakes, the stamp lands, the winning side cheers.
 * @param {import("../types.js").VerdictParts} v
 * @param {boolean} instant  just show the end state
 */
export function verdictFx(v, instant) {
  const stamp = $("#stamp"), gavel = $("#gavel"), scene = $("#scene");
  stamp.className = "stamp " + v[2];
  stamp.querySelector("b").textContent = v[0];
  stamp.querySelector("span").textContent = v[1];
  const win = v[2] === "g" ? cast.prosecution : v[2] === "n" ? cast.defense : null;
  const lose = v[2] === "g" ? cast.defense : v[2] === "n" ? cast.prosecution : null;
  if (instant) {
    stamp.classList.add("on", "parked");
    if (lose) lose.el.classList.add("slump");
    return;
  }
  gavel.classList.remove("strike");
  scene.classList.remove("shake");
  replayAnimation(gavel, "strike");
  // The gavel animation lands at 40% and 75% of its 1.1s; the stamp settles about 450ms after it appears.
  later(() => playSound("gavel"), 440);
  later(() => scene.classList.add("shake"), 430);
  later(() => stamp.classList.add("on"), 500);
  later(() => playSound("gavel"), 825);
  later(() => playSound("stamp"), 950);
  later(() => {
    if (win) replayAnimation(win.el, "cheer");
    if (lose) lose.el.classList.add("slump");
  }, 900);
}

export function showStamp() { $("#stamp").classList.add("on"); }
export function parkStamp() { $("#stamp").classList.add("parked"); }

/** Clear the stamp, gavel and shake. */
export function resetEffects() {
  $("#stamp").className = "stamp";
  $("#gavel").classList.remove("strike");
  $("#scene").classList.remove("shake");
}
