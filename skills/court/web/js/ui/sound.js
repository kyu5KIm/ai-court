// @ts-check
// Sound effects, synthesised with Web Audio (no sound files). Off until the viewer turns them on.
import { $ } from "../core/dom.js";
import { loadPref, savePref } from "../core/prefs.js";
import { t } from "../core/i18n.js";

/** @type {{on: boolean, ctx: AudioContext | null}} */
const audio = { on: false, ctx: null };

/** The audio context, created on first use (browsers only allow it after a click). */
function audioCtx() {
  if (!audio.ctx) {
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return null;
    audio.ctx = new AC();
  }
  if (audio.ctx.state === "suspended") audio.ctx.resume();
  return audio.ctx;
}

/**
 * A short wooden knock: a filtered noise burst over a low sine that drops in pitch.
 * @param {AudioContext} c @param {number} at  start time @param {number} level
 */
function knock(c, at, level) {
  const len = Math.floor(c.sampleRate * 0.08);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const g1 = c.createGain();
  g1.gain.value = level;
  noise.connect(lp).connect(g1).connect(c.destination);
  noise.start(at);

  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(55, at + 0.18);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(level * 0.9, at);
  g2.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
  osc.connect(g2).connect(c.destination);
  osc.start(at);
  osc.stop(at + 0.25);
}

/** A light rising "pop". @param {AudioContext} c @param {number} at */
function pop(c, at) {
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, at);
  osc.frequency.exponentialRampToValueAtTime(900, at + 0.07);
  const g = c.createGain();
  g.gain.setValueAtTime(0.18, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + 0.13);
}

/** @param {"gavel" | "sign" | "stamp"} name */
export function playSound(name) {
  if (!audio.on) return;
  const c = audioCtx();
  if (!c) return;
  const now = c.currentTime;
  if (name === "gavel") knock(c, now, 0.9);
  else if (name === "stamp") knock(c, now, 0.6);
  else pop(c, now);
}

function showSoundState() {
  const b = $("#b-sound");
  b.textContent = audio.on ? "🔊" : "🔇";
  b.title = audio.on ? t("soundOff") : t("soundOn");
  b.setAttribute("aria-label", b.title);
  b.setAttribute("aria-pressed", String(audio.on));
}

export function setupSound() {
  audio.on = loadPref("sound", "off") === "on";
  showSoundState();
  $("#b-sound").addEventListener("click", () => {
    audio.on = !audio.on;
    savePref("sound", audio.on ? "on" : "off");
    showSoundState();
    if (audio.on) playSound("sign");  // a quick sample, and unlocks audio inside the click
  });
}
