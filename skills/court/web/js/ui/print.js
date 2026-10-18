// @ts-check
// Print the judgment: lay out the whole record first, then let print.css drop the stage and controls.
import { $ } from "../core/dom.js";
import { showAll } from "../player/player.js";

export function printRecord() {
  showAll();
  // Let the appended messages lay out before the print dialog snapshots the page.
  window.setTimeout(() => window.print(), 50);
}

export function setupPrint() {
  $("#b-print").addEventListener("click", printRecord);
}
