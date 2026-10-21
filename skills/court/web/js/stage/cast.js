// @ts-check
// The people in the courtroom: where they sit, and how they walk, light up and talk.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { HATS } from "../core/constants.js";
import { t, jurorName, jurorLens } from "../core/i18n.js";
import { reduced, walkMs } from "../core/clock.js";
import { sprite } from "./sprite.js";

/** Every character by id: judge, clerk, prosecution, defense, juror-<i>. @type {Record<string, import("../types.js").Character>} */
export const cast = {};
/** The jurors in seat order. @type {import("../types.js").Character[]} */
export const jurors = [];

/**
 * @param {string} id @param {import("../types.js").CharKind} kind @param {import("../types.js").Pos} home
 * @param {number} z @param {string} [hat] @param {string} [title]
 */
function addCharacter(id, kind, home, z, hat, title) {
  const el = document.createElement("div");
  el.className = "chr " + kind;
  el.style.zIndex = String(z);
  el.title = title || "";
  el.innerHTML = '<div class="sign"><b></b><i></i></div><div class="think">…</div>' + sprite(kind, hat);
  const eyes = /** @type {SVGElement} */ (el.querySelector(".eyes"));
  eyes.style.animationDelay = (-Math.random() * 4).toFixed(2) + "s";
  $("#scene").appendChild(el);
  /** @type {import("../types.js").Character} */
  const c = { id, kind, el, home, pos: home, hat, walkTimer: 0 };
  cast[id] = c;
  place(c, home, true);
  return c;
}

/**
 * Put a character at `pos` (% of the scene). `instant` skips the walking transition.
 * @param {import("../types.js").Character} c @param {import("../types.js").Pos} pos @param {boolean} instant
 */
export function place(c, pos, instant) {
  c.pos = { x: pos.x, y: pos.y };
  if (instant) c.el.style.transition = "none";
  c.el.style.setProperty("--x", String(pos.x));
  c.el.style.setProperty("--y", String(pos.y));
  if (instant) { void c.el.offsetWidth; c.el.style.transition = ""; }
}

/**
 * Walk a character to `pos`. Returns how long the walk takes.
 * @param {import("../types.js").Character} c @param {import("../types.js").Pos} pos
 */
export function walk(c, pos) {
  if (c.pos.x === pos.x && c.pos.y === pos.y) return 0;
  const ms = walkMs();
  clearTimeout(c.walkTimer);
  c.el.classList.add("walking");
  place(c, pos, reduced);
  c.walkTimer = window.setTimeout(() => c.el.classList.remove("walking"), ms);
  return ms;
}

/** Seat everyone. Jurors fill one row of up to six, or two rows. */
export function buildCast() {
  addCharacter("judge", "judge", { x: 50, y: 31 }, 10, undefined, t("judge"));
  addCharacter("clerk", "clerk", { x: 25, y: 38 }, 14, undefined, t("clerk"));
  addCharacter("prosecution", "prosecution", { x: 15, y: 60 }, 30, undefined, t("prosecution"));
  addCharacter("defense", "defense", { x: 85, y: 60 }, 30, undefined, t("defense"));

  const n = app.data.jurors.length, cols = Math.min(n, 6), rows = Math.ceil(n / cols);
  const rowY = rows === 1 ? [93] : [83, 97];
  $("#jurybox").style.top = (rowY[0] - 15) + "%";
  app.data.jurors.forEach((j, i) => {
    const r = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - r * cols);
    const x = inRow === 1 ? 50 : 12 + (76 / (inRow - 1)) * col;
    /** @type {[string, string]} */
    const info = [jurorName(j.juror), jurorLens(j.juror, j.lens)];
    const c = addCharacter("juror-" + i, "juror", { x, y: rowY[r] }, 40 + r * 2, HATS[i % HATS.length],
      t("jurorLabel", i + 1, info[0]));
    c.info = info;
    jurors.push(c);
  });
}

/** Light up one character, or nobody. @param {string | null} id */
export function spotlight(id) {
  for (const k in cast) cast[k].el.classList.toggle("active", k === id);
}

/** Make one character talk, or stop everyone. @param {string | null} id @param {boolean} on */
export function talking(id, on) {
  for (const k in cast) cast[k].el.classList.remove("talking");
  if (on && id && cast[id]) cast[id].el.classList.add("talking");
}

/** Back to the opening positions with no signs or states. */
export function resetCast() {
  for (const k in cast) {
    const c = cast[k];
    clearTimeout(c.walkTimer);
    c.el.className = "chr " + c.kind;
    /** @type {HTMLElement} */ (c.el.querySelector(".sign")).className = "sign";
    place(c, c.home, true);
  }
}

/**
 * Everyone back in their seat, keeping signs and the verdict mood.
 * @param {boolean} [keepThinking]  leave "…" on jurors still deliberating (jumping into the jury phase)
 */
export function settleCast(keepThinking) {
  for (const k in cast) {
    const c = cast[k];
    clearTimeout(c.walkTimer);
    c.el.classList.remove("walking", "talking", "active", "hop", "cheer");
    if (!keepThinking) c.el.classList.remove("thinking");
    place(c, c.home, true);
  }
}
