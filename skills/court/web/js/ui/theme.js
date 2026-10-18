// @ts-check
// Light / dark switch. "auto" follows the system; the colour tokens read <html data-theme>.
import { $ } from "../core/dom.js";
import { loadPref, savePref } from "../core/prefs.js";

const THEMES = ["auto", "light", "dark"];
/** @type {Record<string, [string, string]>} */
const THEME_LABEL = { auto: ["◐", "화면: 시스템 설정"], light: ["☀", "화면: 밝게"], dark: ["☾", "화면: 어둡게"] };

/** @param {string} mode */
function applyTheme(mode) {
  if (mode === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  const b = $("#b-theme");
  b.textContent = THEME_LABEL[mode][0];
  b.title = THEME_LABEL[mode][1];
  b.setAttribute("aria-label", THEME_LABEL[mode][1]);
}

export function setupTheme() {
  let mode = loadPref("theme", "auto");
  if (!THEMES.includes(mode)) mode = "auto";
  applyTheme(mode);
  $("#b-theme").addEventListener("click", () => {
    mode = THEMES[(THEMES.indexOf(mode) + 1) % THEMES.length];
    savePref("theme", mode);
    applyTheme(mode);
  });
}
