// @ts-check
// Click (or Enter on) someone in the courtroom: jump to what they last said, and ask them next.
import { player } from "../core/state.js";
import { $, replayAnimation } from "../core/dom.js";
import { cast } from "./cast.js";
import { say } from "./bubble.js";
import { t } from "../core/i18n.js";

const pickState = { timer: 0 };

/** @param {string} id */
function pickCharacter(id) {
  const c = cast[id];
  if (!c) return;
  const said = Array.from(document.querySelectorAll('#log [data-actor="' + id + '"]'));
  const last = /** @type {HTMLElement | undefined} */ (said[said.length - 1]);
  if (last) {
    last.scrollIntoView({ block: "center", behavior: "smooth" });
    replayAnimation(last, "flash");
  } else if (!player.cur) {
    clearTimeout(pickState.timer);
    say(c, t("notYet"));
    pickState.timer = window.setTimeout(() => { if (!player.cur) say(null); }, 1600);
  }
  const who = /** @type {HTMLSelectElement} */ ($("#ask-who"));
  if (Array.from(who.options).some((o) => o.value === id)) who.value = id;
}

export function setupCharacterPick() {
  for (const id in cast) {
    const el = cast[id].el;
    el.dataset.id = id;
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", t("seeWords", el.title));
  }
  $("#scene").addEventListener("click", (e) => {
    const el = e.target instanceof Element ? e.target.closest(".chr") : null;
    if (el instanceof HTMLElement && el.dataset.id) pickCharacter(el.dataset.id);
  });
  $("#scene").addEventListener("keydown", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || !el.classList.contains("chr") || !el.dataset.id) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();  // Space here picks; it doesn't toggle playback
      pickCharacter(el.dataset.id);
    }
  });
}
