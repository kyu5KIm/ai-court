// @ts-check
// Steps through the scenes: walk to the lectern, reveal the message part by part, walk back, next.
import { player, waitingForMore } from "../core/state.js";
import { clock, later, clearTimers } from "../core/clock.js";
import { LECTERN } from "../core/constants.js";
import { cast, walk, spotlight, talking, resetCast, settleCast } from "../stage/cast.js";
import { say } from "../stage/bubble.js";
import { setScore, showStamp, resetEffects } from "../stage/effects.js";
import { setPhase } from "../header/header.js";
import { logEl, sceneEl, revealItems, itemText, nearBottom, follow } from "../transcript/messages.js";
import { renderIntro, markIntroStarted } from "../transcript/intro.js";
import { buildScenes } from "./scenes.js";
import { sync, setNow } from "./controls.js";
import { waitingFx } from "../live/status.js";
import { clearDraft } from "../live/draft.js";
import { t } from "../core/i18n.js";

/**
 * Start a scene. `manual` (the user pressed next) always scrolls it into view.
 * @param {import("../types.js").Scene} sc @param {boolean} [manual]
 */
function play(sc, manual) {
  clearDraft();
  clearTimers();
  const stick = !!manual || player.idx === 1 || nearBottom();
  setPhase(sc.phase);
  spotlight(sc.actor);
  setNow(sc.kind === "verdict" ? t("verdictReading") : (sc.name || "") + (sc.tag ? " · " + sc.tag : ""), true);
  say(null);
  const el = sceneEl(sc);
  logEl().appendChild(el);
  const items = revealItems(el);
  items.forEach((it) => it.classList.add("pending"));
  if (items.length) el.classList.add("typing");
  const pre = sc.walks ? walk(cast[sc.actor], LECTERN) : 0;
  if (sc.enter) sc.enter(false);
  player.cur = { sc, el, items, i: 0, held: false };
  follow(el, stick);
  later(() => {
    if (player.cur && player.cur.sc === sc) { talking(sc.actor, items.length > 0); tick(); }
  }, pre + 300 / clock.speed);
  waitingFx();
  sync();
}

/** Reveal the next part of the current message, then wait in proportion to its length. */
function tick() {
  const c = player.cur;
  if (!c) return;
  if (c.i >= c.items.length) {
    if (c.sc.hold && !c.held) { c.held = true; later(tick, c.sc.hold / clock.speed); return; }
    done();
    return;
  }
  const stick = nearBottom();
  const it = c.items[c.i++];
  it.classList.remove("pending");
  it.classList.add("shown");
  if (c.i >= c.items.length) c.el.classList.remove("typing");
  if (!it.classList.contains("path") && !it.classList.contains("action")) say(cast[c.sc.actor], itemText(it), c.sc.tone);
  follow(it, stick);
  const len = (it.textContent || "").length;
  later(tick, Math.min(9000, 420 + len * 26) / clock.speed);
}

/** Show the rest of the current scene at once. */
function finish() {
  const c = player.cur;
  if (!c) return;
  clearTimers();
  c.items.forEach((it) => { it.classList.remove("pending"); it.classList.add("shown"); });
  c.el.classList.remove("typing");
  c.i = c.items.length;
  c.held = true;
  if (c.sc.kind === "verdict") showStamp();
  done();
}

/** The current scene is over: walk back, then move on if playing. */
function done() {
  const c = player.cur;
  player.cur = null;
  talking(null, false);
  say(null);
  if (c) {
    if (c.sc.walks) walk(cast[c.sc.actor], cast[c.sc.actor].home);
    if (c.sc.after) c.sc.after();
  }
  if (player.playing) {
    if (player.idx < player.scenes.length) {
      later(() => { if (player.playing && !player.cur) step(); }, ((c && c.sc.pause) || 1100) / clock.speed);
    } else if (!waitingForMore()) {
      setPlaying(false);
    }
  }
  waitingFx();
  sync();
}

/** Next: finish the scene in progress, or start the next one. @param {boolean} [manual] */
export function step(manual) {
  if (player.cur) { finish(); return; }
  if (player.idx >= player.scenes.length) return;
  markIntroStarted();
  play(player.scenes[player.idx++], manual);
}

/** @param {boolean} on */
export function setPlaying(on) {
  player.playing = on;
  if (on && !player.cur && player.idx < player.scenes.length) step();
  sync();
}

/** Back to the opening, nothing played. */
export function restart() {
  clearTimers();
  player.cur = null;
  player.idx = 0;
  player.playing = false;
  logEl().innerHTML = "";
  resetCast();
  resetEffects();
  say(null);
  setScore(0, 0, false);
  setPhase(-1);
  setNow(t("waitingOpen"), false);
  renderIntro();
  sync();
}

/** Put every scene there is into the transcript at once, with the stage in its end state. */
/** Put scenes into the transcript at once, up to (not including) `target`, with their end state on stage. @param {number} target */
function applyScenes(target) {
  markIntroStarted();
  while (player.idx < target) {
    const sc = player.scenes[player.idx++];
    setPhase(sc.phase);
    logEl().appendChild(sceneEl(sc));
    if (sc.enter) sc.enter(true);
    if (sc.after) sc.after();
  }
}

export function showAll() {
  player.playing = false;
  if (player.cur) finish();
  clearTimers();
  applyScenes(player.scenes.length);
  settleCast();
  say(null);
  setNow(t("wholeRecord"), true);
  sync();
}

/**
 * Jump to scene `k`: everything before it appears at once, then scene k plays (and the replay keeps
 * going if it was playing).
 * @param {number} k
 */
export function seekTo(k) {
  const target = Math.max(0, Math.min(k, player.scenes.length));
  const wasPlaying = player.playing;
  restart();
  applyScenes(target);
  settleCast(true);
  say(null);
  if (target < player.scenes.length) {
    if (wasPlaying) setPlaying(true); else step(true);
  }
  sync();
}

/** New data arrived: append the scenes it adds and keep playing if we were waiting for them. */
export function mergeScenes() {
  const next = buildScenes();
  for (let k = player.scenes.length; k < next.length; k++) player.scenes.push(next[k]);
  if (player.playing && !player.cur && player.idx < player.scenes.length) step();
  waitingFx();
  sync();
}
