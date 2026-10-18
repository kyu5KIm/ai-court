// @ts-check
// Past trials: a list of every trial in .court/ (newest first), each one openable with ?run=NAME.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { fetchTrials } from "./api.js";
import { t, runDate } from "../core/i18n.js";

/** @param {any} tr  one entry from /api/trials */
export function verdictBadge(tr) {
  if (!tr.verdict) return '<span class="badge">' + (tr.finished ? t("noVerdict") : t("running")) + "</span>";
  const cls = tr.verdict === "GUILTY" ? "g" : tr.verdict === "NOT GUILTY" ? "n" : "";
  const word = tr.verdict === "GUILTY" ? t("guilty") : tr.verdict === "NOT GUILTY" ? t("notGuilty") : t("hungShort");
  return '<span class="badge ' + cls + '">' + word + " " + tr.guilty + ":" + tr.not_guilty + "</span>";
}

/** The trial this page shows, as a /api/trials name. */
export function viewedRun() {
  return app.run || String(app.data.run || "");
}

async function openTrials() {
  const dlg = $("#trials"), list = $("#trial-list");
  list.innerHTML = '<li class="muted">' + t("loading") + "</li>";
  if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  try {
    const trials = await fetchTrials();
    const here = viewedRun();
    list.innerHTML = trials.length ? trials.map((tr) =>
      '<li class="trial' + (tr.run === here ? " here" : "") + '">' +
      '<label class="pick"><input type="checkbox" value="' + esc(tr.run) + '" aria-label="' + t("pickCompare") + '"></label>' +
      '<a href="./?run=' + encodeURIComponent(tr.run) + '">' +
      '<span class="when">' + esc(runDate(tr.run)) + (tr.latest ? t("latest") : "") + (tr.run === here ? t("viewing") : "") + "</span>" +
      '<span class="what">' + esc(tr.case || t("noCase")) + "</span></a>" + verdictBadge(tr) + "</li>").join("")
      : '<li class="muted">' + t("noTrials") + "</li>";
  } catch (e) {
    list.innerHTML = '<li class="muted">' + t("listFail") + "</li>";
  }
  list.dispatchEvent(new Event("change"));
}

function closeTrials() {
  const dlg = $("#trials");
  if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
}

export function setupTrials() {
  const d = app.data;
  if (!d.live) return;
  $("#b-trials").hidden = false;
  $("#b-trials").addEventListener("click", openTrials);
  $("#trials-close").addEventListener("click", closeTrials);
  // Looking at an older trial: say so, with the way back to the newest one.
  if (app.run) {
    const v = $("#viewing");
    v.innerHTML = t("viewingOld");
    v.hidden = false;
  }
}
