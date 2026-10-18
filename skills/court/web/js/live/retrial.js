// @ts-check
// Retrial: file the same case again with the judge's conditions for acquittal attached, before the same jury.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { acquittalConditions } from "../ui/share.js";
import { openNewCase } from "./newCase.js";
import { runDate, viewedRun } from "./trials.js";

/** A retrial needs a judgment to answer, and a server that can open trials. */
function canRetry() {
  const d = app.data;
  return !!(d.live && d.ask && !d.empty && d.judge);
}

/** The case text for the retrial: the original, the conditions, and a place to say what was done. */
export function retrialCase() {
  const d = app.data;
  const conditions = acquittalConditions();
  const lines = [String(d.case || "").trim(), "", "[재심] 지난 재판(" + runDate(viewedRun()) + ")에서 판사가 낸 무죄 조건:"];
  conditions.forEach((c, i) => lines.push((i + 1) + ". " + c));
  if (!conditions.length) lines.push("(판결문에서 무죄 조건을 찾지 못했어요. 직접 적어 주세요.)");
  lines.push("", "위 조건 중 해낸 것과 그 결과:", "- ");
  return lines.join("\n");
}

export function openRetrial() {
  const d = app.data;
  openNewCase({ case: retrialCase(), jury: d.jurors.length, seed: d.seed == null ? "" : String(d.seed) });
}

/** Show or hide the header button as the trial finishes. */
export function updateRetrialButton() {
  $("#b-retrial").hidden = !canRetry();
}

export function setupRetrial() {
  $("#b-retrial").addEventListener("click", openRetrial);
  // The closing scene carries a button too; it is added to the transcript later, so listen on the log.
  $("#log").addEventListener("click", (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-action="retrial"]') : null;
    if (b) openRetrial();
  });
  updateRetrialButton();
}

/** Whether the closing scene should offer a retrial button. */
export function retrialOffered() {
  return canRetry();
}
