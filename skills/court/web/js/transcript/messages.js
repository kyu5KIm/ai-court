// @ts-check
// The transcript column: one message per scene, revealed paragraph by paragraph.
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { reduced } from "../core/clock.js";
import { cast } from "../stage/cast.js";
import { sprite } from "../stage/sprite.js";

/** @returns {HTMLElement} */
export function logEl() {
  return $("#log");
}

/** A small sprite of whoever speaks. @param {string} actor */
export function avatar(actor) {
  const c = cast[actor] || cast.clerk;
  return '<span class="av">' + sprite(c.kind, c.hat) + "</span>";
}

/** The message element for a scene. @param {import("../types.js").Scene} sc */
export function sceneEl(sc) {
  const el = document.createElement("article");
  el.dataset.actor = sc.actor;
  if (sc.kind === "verdict" && sc.verdict) {
    el.className = "verdict " + sc.verdict[2];
    el.innerHTML = sc.html;
    return el;
  }
  el.className = "msg " + (sc.side || "center");
  el.innerHTML = "<header>" + avatar(sc.actor) + "<b>" + esc(sc.name) + "</b>" +
    (sc.tag ? '<span class="tag">' + esc(sc.tag) + "</span>" : "") + (sc.badge || "") + "</header>" +
    (sc.lens ? '<div class="lens">' + esc(sc.lens) + "</div>" : "") +
    '<div class="body">' + sc.html + "</div>";
  return el;
}

/** The parts of a message that appear one at a time. @param {HTMLElement} el @returns {HTMLElement[]} */
export function revealItems(el) {
  return Array.from(el.querySelectorAll(
    ".body > p, .body > h4, .body > blockquote > p, .body > blockquote li, .body > ol > li, .body > ul > li, .body > .line"));
}

/** What the speech bubble should say for one revealed part. @param {HTMLElement} it */
export function itemText(it) {
  if (it.classList.contains("line")) return /** @type {HTMLElement} */ (it.lastElementChild).textContent || "";
  const en = it.querySelector(".en");
  const text = it.textContent || "";
  return en ? text.replace(en.textContent || "", "").trim() : text;
}

/** The reader is at (or near) the bottom, so new messages should scroll into view. */
export function nearBottom() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 280;
}

/** @param {Element} el @param {boolean} stick */
export function follow(el, stick) {
  if (stick) el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
}
