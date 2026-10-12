// @ts-check
// 16×16 pixel characters, drawn as SVG rects. Each role adds its own accessory.
import { ORANGE, INK } from "../core/constants.js";

/**
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {string} c
 */
function px(x, y, w, h, c) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>';
}

/** @param {import("../types.js").CharKind} kind @param {string | undefined} hat */
function accessory(kind, hat) {
  if (kind === "judge") {
    const w = "#f4f1ea", wd = "#d9d3c4";
    return px(3, 0, 10, 1, w) + px(2, 1, 12, 2, w) + px(1, 3, 2, 1, w) + px(13, 3, 2, 1, w) +
      px(1, 4, 1, 2, wd) + px(14, 4, 1, 2, wd) + px(2, 9, 12, 2, "#2a2118");
  }
  if (kind === "prosecution" || kind === "defense") {
    const tie = kind === "prosecution" ? "#b3261e" : "#1f5fa8";
    const knot = kind === "prosecution" ? "#7d1a14" : "#153f72";
    return px(7, 7, 2, 1, knot) + px(7, 8, 2, 3, tie);
  }
  if (kind === "clerk") {
    const lens = (/** @type {number} */ x) =>
      '<rect x="' + x + '" y="4.5" width="3" height="3" fill="none" stroke="' + INK + '" stroke-width=".5"/>';
    return px(3, 1, 10, 2, "#2e7d4f") + px(1, 2, 3, 1, "#2e7d4f") + lens(4) + lens(9);
  }
  if (kind === "juror" && hat) return px(4, 1, 8, 2, hat) + px(2, 2, 12, 1, hat);
  return "";
}

/**
 * SVG markup for one character. Legs, torso and eyes are separate groups so CSS can animate them.
 * @param {import("../types.js").CharKind} kind
 * @param {string} [hat]  juror hat colour
 * @param {string} [cls]  extra class on the <svg>
 */
export function sprite(kind, hat, cls) {
  return '<svg class="spr' + (cls ? " " + cls : "") + '" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' +
    '<g class="la">' + px(3, 11, 1, 3, ORANGE) + px(10, 11, 1, 3, ORANGE) + "</g>" +
    '<g class="lb">' + px(5, 11, 1, 3, ORANGE) + px(12, 11, 1, 3, ORANGE) + "</g>" +
    '<g class="torso">' + px(2, 3, 12, 8, ORANGE) + px(0, 6, 2, 2, ORANGE) + px(14, 6, 2, 2, ORANGE) +
    '<g class="eyes">' + px(5, 5, 1, 2, INK) + px(10, 5, 1, 2, INK) + "</g>" +
    accessory(kind, hat) + "</g></svg>";
}
