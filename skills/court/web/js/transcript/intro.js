// @ts-check
// The card at the top of the transcript: the case and a start button, or an empty-court notice.
import { app } from "../core/state.js";
import { esc } from "../core/markdown.js";
import { sprite } from "../stage/sprite.js";
import { caseTitle } from "../header/header.js";
import { logEl } from "./messages.js";
import { setPlaying } from "../player/player.js";
import { openNewCase } from "../live/newCase.js";
import { renderPast } from "../live/questions.js";
import { t } from "../core/i18n.js";

const CAST_ROW = () =>
  '<div class="cast">' + sprite("prosecution") + sprite("judge", undefined, "big") + sprite("defense") + "</div>";

export function renderIntro() {
  const d = app.data, el = document.createElement("div");
  el.className = "intro";
  if (d.empty) {
    el.innerHTML = CAST_ROW() + '<h2>' + t("appName") + '</h2><p class="case">' + t("noTrial") + '</p>' +
      (d.ask
        ? '<p class="meta">' + t("emptyMeta") + '</p><button class="primary" id="b-intro-new">' + t("fileCase") + '</button>'
        : '<p class="meta">' + t("noCli") + '</p>');
    logEl().appendChild(el);
    const b = el.querySelector("#b-intro-new");
    if (b) b.addEventListener("click", () => openNewCase());
    return;
  }
  el.innerHTML = CAST_ROW() + '<h2>' + t("caseHead") + '</h2><p class="case">' + esc(caseTitle()) + "</p>" +
    '<p class="meta">' + t("introMeta", d.jurors.length) + "</p>" +
    '<button class="primary" id="b-intro">' + t("start") + "</button>" +
    '<p class="hint">' + t("introHint") + "</p>";
  logEl().appendChild(el);
  /** @type {HTMLElement} */ (el.querySelector("#b-intro")).addEventListener("click", () => setPlaying(true));
  renderPast();
}

/** Hide the intro's start button once the trial is underway. */
export function markIntroStarted() {
  const intro = document.querySelector(".intro");
  if (intro) intro.classList.add("started");
}
