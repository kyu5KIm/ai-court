// @ts-check
// The scene bar under the stage, and the phase chips in the header: both jump to a scene.
import { player, waitingForMore } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { t, PHASE_NAMES } from "../core/i18n.js";
import { seekTo } from "./player.js";

const timelineView = { built: -1 };

/** The scene shown now: the one playing, or the last one played (idx points at the next). */
function currentScene() {
  return player.idx - 1;
}

/** Rebuild the bar when scenes are added, then mark done / current / ahead. */
export function renderTimeline() {
  const bar = $("#timeline");
  const more = waitingForMore();
  if (timelineView.built !== player.scenes.length + (more ? 0.5 : 0)) {
    timelineView.built = player.scenes.length + (more ? 0.5 : 0);
    bar.innerHTML = player.scenes.map((sc, i) => {
      const label = sc.kind === "verdict" ? t("verdictWord") : (sc.name || "") + (sc.tag ? " · " + sc.tag : "");
      return '<button type="button" class="tl p' + sc.phase + (sc.kind === "verdict" ? " verdict" : "") +
        '" data-i="' + i + '" title="' + esc((i + 1) + ". " + label) + '" aria-label="' + esc(label) + '"></button>';
    }).join("") + (more ? '<span class="tl more" title="' + t("stillRunning") + '"></span>' : "");
    bar.hidden = player.scenes.length === 0;
  }
  const now = currentScene();
  bar.querySelectorAll("button.tl").forEach((b, i) => {
    b.classList.toggle("done", i < now || (i === now && !player.cur));
    b.classList.toggle("on", i === now);
  });
  const have = new Set(player.scenes.map((sc) => sc.phase));
  Array.from($("#phases").children).forEach((li, i) => li.classList.toggle("na", !have.has(i)));
}

export function setupTimeline() {
  $("#timeline").addEventListener("click", (e) => {
    const b = e.target instanceof Element ? e.target.closest("button.tl") : null;
    if (b instanceof HTMLElement) seekTo(Number(b.dataset.i));
  });
  $("#phases").addEventListener("click", (e) => {
    const li = e.target instanceof Element ? e.target.closest("li") : null;
    if (!li) return;
    const phase = Array.from($("#phases").children).indexOf(li);
    const first = player.scenes.findIndex((sc) => sc.phase === phase);
    if (first >= 0) seekTo(first);
  });
  Array.from($("#phases").children).forEach((li, i) => li.setAttribute("title", t("goTo", PHASE_NAMES[i])));
}
