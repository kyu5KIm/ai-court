// @ts-check
// The buttons and keys under the stage, and the "now playing" line.
import { player, isOver } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { clock, walkMs, nextSpeed } from "../core/clock.js";
import { step, setPlaying, restart, showAll } from "./player.js";
import { openHelp } from "../ui/help.js";
import { renderTimeline } from "./timeline.js";
import { t } from "../core/i18n.js";

/** Bring the button labels in line with the player. */
export function sync() {
  const none = player.idx >= player.scenes.length && !player.cur;
  $("#b-play").textContent = player.playing ? t("pause")
    : isOver() ? t("replay")
    : player.idx === 0 ? t("start") : t("play");
  $("#b-next").disabled = none;
  $("#b-all").disabled = none;
  $("#b-speed").textContent = clock.speed + "×";
  renderTimeline();
}

/** @param {number} s */
export function setSpeed(s) {
  clock.speed = s;
  $("#scene").style.setProperty("--walk", walkMs() + "ms");
  sync();
}

/** @param {string} text @param {boolean} strong */
export function setNow(text, strong) {
  $("#now").innerHTML = strong ? "<b>" + esc(text) + "</b>" : esc(text);
}

function togglePlay() {
  if (player.playing) { setPlaying(false); return; }
  if (isOver()) restart();
  setPlaying(true);
}

export function bindControls() {
  $("#b-play").addEventListener("click", togglePlay);
  $("#b-next").addEventListener("click", () => step(true));
  $("#b-restart").addEventListener("click", restart);
  $("#b-all").addEventListener("click", showAll);
  $("#b-speed").addEventListener("click", () => setSpeed(nextSpeed()));
  document.addEventListener("keydown", (e) => {
    const t = e.target instanceof HTMLElement ? e.target.tagName : "";
    if (t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
    if (t === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
    if (e.key === " ") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(true); }
    else if (e.key === "Home") { e.preventDefault(); restart(); }
    else if (e.key === "?") { e.preventDefault(); openHelp(); }
  });
}
