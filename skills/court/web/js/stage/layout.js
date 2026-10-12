// @ts-check
// Keeps measurements that depend on the window size up to date.
import { $ } from "../core/dom.js";
import { resay } from "./bubble.js";

/** The pinned stage height (phones scroll messages under it) and the bubble position. */
export function measure() {
  document.documentElement.style.setProperty("--stage-h", $("#stage").offsetHeight + "px");
  resay();
}

export function watchLayout() {
  window.addEventListener("resize", measure);
  measure();
}
