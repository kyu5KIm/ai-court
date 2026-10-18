// @ts-check
// The keyboard shortcut sheet, opened with "?" or the ? button.
import { $ } from "../core/dom.js";

export function openHelp() {
  const dlg = $("#help");
  if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
}

function closeHelp() {
  const dlg = $("#help");
  if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
}

export function setupHelp() {
  $("#b-help").addEventListener("click", openHelp);
  $("#help-close").addEventListener("click", closeHelp);
}
