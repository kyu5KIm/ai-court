// @ts-check
// Page header (case title, phase chips, LIVE badge) and the footer.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { t, PHASE_NAMES } from "../core/i18n.js";

/** The first line of the case file, or a placeholder. */
export function caseTitle() {
  if (app.data.empty) return t("noTrial");
  const first = String(app.data.case || "").split("\n").map((s) => s.trim()).filter(Boolean)[0];
  return (first || t("noCaseText")).replace(/^#+\s*/, "");
}

export function renderHeader() {
  const d = app.data;
  // The page is always titled "AI 법정"; the case itself opens the transcript (intro card).
  $("#case-title").textContent = t("appName");
  $("#phases").innerHTML = PHASE_NAMES.map((p) => "<li>" + p + "</li>").join("");
  $("#foot").innerHTML = t("footFolder") + esc(d.dir) + (d.seed != null ? t("footSeed") + esc(d.seed) : "") +
    '<br>Made with <a href="https://github.com/alexyc9381/court-skill">/court</a>, a free Claude Code skill by Alex Chen (@nocodealex).';
  if (!d.live) {
    $("#foot").insertAdjacentHTML("beforeend", t("footServe"));
  }
}

/** Highlight the current phase chip; earlier ones read as done. @param {number} p */
export function setPhase(p) {
  Array.from($("#phases").children).forEach((li, i) => {
    li.classList.toggle("on", i === p);
    li.classList.toggle("done", i < p);
  });
}

/** "LIVE" while a served trial runs, then "재판 종료" (the dot is drawn by CSS). */
export function liveBadge() {
  const el = $("#live"), d = app.data;
  if (d.empty || !d.live) { el.textContent = ""; return; }
  el.textContent = d.finished ? (d.ask ? t("liveDoneAsk") : t("liveDone")) : t("live");
  el.classList.toggle("done", !!d.finished);
}
