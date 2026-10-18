// @ts-check
// The EN / 한 button: switch the page language and redraw (the replay starts over in the new language).
import { $ } from "../core/dom.js";
import { savePref } from "../core/prefs.js";
import { lang } from "../core/i18n.js";

export function setupLang() {
  $("#b-lang").addEventListener("click", () => {
    savePref("lang", lang === "en" ? "ko" : "en");
    location.reload();
  });
}
