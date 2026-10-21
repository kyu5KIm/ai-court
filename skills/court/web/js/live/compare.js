// @ts-check
// Compare two trials (usually a case and its retrial): verdicts side by side, and who changed their vote.
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { VOTE_CLS } from "../core/constants.js";
import { t, runDate, voteWord, jurorName } from "../core/i18n.js";
import { fetchTrial } from "./api.js";

/** @param {import("../types.js").CourtData} d */
function verdictLine(d) {
  if (!d.jurors.length || !d.jurors.every((j) => j.voted)) return t("cmpPending");
  const word = d.verdict === "GUILTY" ? t("guilty") : d.verdict === "NOT GUILTY" ? t("notGuilty") : t("hung");
  return word + " " + d.guilty + " : " + d.not_guilty;
}

/** @param {import("../types.js").CourtData} d */
function firstLine(d) {
  return (String(d.case || "").split("\n").map((l) => l.replace(/^#+\s*/, "").trim()).filter(Boolean)[0] || "").slice(0, 80);
}

/** @param {import("../types.js").JurorRecord | undefined} j */
function voteCell(j) {
  if (!j) return '<td class="muted">—</td>';
  if (!j.voted) return '<td class="muted">' + t("deliberating") + "</td>";
  return '<td><span class="vote ' + (VOTE_CLS[j.vote] || "") + '">' + esc(voteWord(j.vote)) + "</span></td>";
}

/**
 * Fetch two trials and show them side by side, older first.
 * @param {string} runA @param {string} runB
 */
export async function openCompare(runA, runB) {
  const [older, newer] = [runA, runB].sort();
  const dlg = $("#compare"), body = $("#compare-body");
  body.innerHTML = '<p class="muted">' + t("loading") + "</p>";
  if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  try {
    const [a, b] = await Promise.all([fetchTrial(older), fetchTrial(newer)]);
    const byA = new Map(a.jurors.map((j) => [j.juror, j])), byB = new Map(b.jurors.map((j) => [j.juror, j]));
    const names = Array.from(new Set([...byA.keys(), ...byB.keys()]));
    let changed = 0;
    const rows = names.map((n) => {
      const ja = byA.get(n), jb = byB.get(n);
      const flip = !!(ja && jb && ja.voted && jb.voted && ja.vote !== jb.vote);
      if (flip) changed++;
      return '<tr class="' + (flip ? "flipped" : "") + '"><td>' + esc(jurorName(n)) + "</td>" +
        voteCell(ja) + voteCell(jb) + "<td>" + (flip ? t("changed") : "") + "</td></tr>";
    }).join("");
    const sameJury = names.length === byA.size && names.length === byB.size;
    body.innerHTML =
      '<div class="cmp-head">' +
      [[older, a], [newer, b]].map(([run, d]) => '<div class="cmp-col"><span class="when">' + esc(runDate(String(run))) +
        '</span><b>' + esc(verdictLine(/** @type {any} */ (d))) + '</b><span class="what">' + esc(firstLine(/** @type {any} */ (d))) +
        "</span></div>").join("") + "</div>" +
      '<p class="cmp-sum">' + (changed ? t("cmpChanged", changed) : t("cmpNone")) +
      (sameJury ? "" : t("cmpDiffJury")) + "</p>" +
      '<div class="cmp-scroll"><table class="cmp-table"><tr><th>' + t("thJuror") + '</th><th>' + t("thBefore") +
      '</th><th>' + t("thAfter") + "</th><th></th></tr>" +
      rows + "</table></div>";
  } catch (e) {
    body.innerHTML = '<p class="muted">' + t("loadFail") + "</p>";
  }
}

export function setupCompare() {
  const list = $("#trial-list"), go = $("#trials-compare");
  const picked = () => Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map((i) => /** @type {HTMLInputElement} */ (i).value);
  list.addEventListener("change", () => {
    const n = picked().length;
    go.disabled = n !== 2;
    go.textContent = n === 2 ? t("cmpGo") : t("cmpPick", n);
  });
  go.addEventListener("click", () => {
    const [a, b] = picked();
    if (a && b) openCompare(a, b);
  });
  $("#compare-close").addEventListener("click", () => {
    const dlg = $("#compare");
    if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
  });
}
