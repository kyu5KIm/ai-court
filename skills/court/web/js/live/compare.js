// @ts-check
// Compare two trials (usually a case and its retrial): verdicts side by side, and who changed their vote.
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { JUROR_KO, VOTE_KO, VOTE_CLS } from "../core/constants.js";
import { fetchTrial } from "./api.js";
import { runDate } from "./trials.js";

/** @param {import("../types.js").CourtData} d */
function verdictLine(d) {
  if (!d.jurors.length || !d.jurors.every((j) => j.voted)) return "아직 평결 전";
  const word = d.verdict === "GUILTY" ? "유죄" : d.verdict === "NOT GUILTY" ? "무죄" : "평결 불성립";
  return word + " " + d.guilty + " : " + d.not_guilty;
}

/** @param {import("../types.js").CourtData} d */
function firstLine(d) {
  return (String(d.case || "").split("\n").map((l) => l.replace(/^#+\s*/, "").trim()).filter(Boolean)[0] || "").slice(0, 80);
}

/** @param {import("../types.js").JurorRecord | undefined} j */
function voteCell(j) {
  if (!j) return '<td class="muted">—</td>';
  if (!j.voted) return '<td class="muted">평의 중</td>';
  return '<td><span class="vote ' + (VOTE_CLS[j.vote] || "") + '">' + esc(VOTE_KO[j.vote] || j.vote) + "</span></td>";
}

/**
 * Fetch two trials and show them side by side, older first.
 * @param {string} runA @param {string} runB
 */
export async function openCompare(runA, runB) {
  const [older, newer] = [runA, runB].sort();
  const dlg = $("#compare"), body = $("#compare-body");
  body.innerHTML = '<p class="muted">불러오는 중…</p>';
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
      return '<tr class="' + (flip ? "flipped" : "") + '"><td>' + esc(JUROR_KO[n] ? JUROR_KO[n][0] : n) + "</td>" +
        voteCell(ja) + voteCell(jb) + "<td>" + (flip ? "바뀜" : "") + "</td></tr>";
    }).join("");
    const sameJury = names.length === byA.size && names.length === byB.size;
    body.innerHTML =
      '<div class="cmp-head">' +
      [[older, a], [newer, b]].map(([run, d]) => '<div class="cmp-col"><span class="when">' + esc(runDate(String(run))) +
        '</span><b>' + esc(verdictLine(/** @type {any} */ (d))) + '</b><span class="what">' + esc(firstLine(/** @type {any} */ (d))) +
        "</span></div>").join("") + "</div>" +
      '<p class="cmp-sum">' + (changed ? "표를 바꾼 배심원 " + changed + "명" : "표를 바꾼 배심원은 없어요") +
      (sameJury ? "" : " · 두 재판의 배심원 구성이 달라요. 재심 때 같은 시드와 인원을 쓰면 같은 배심원이 앉아요.") + "</p>" +
      '<div class="cmp-scroll"><table class="cmp-table"><tr><th>배심원</th><th>앞 재판</th><th>뒤 재판</th><th></th></tr>' +
      rows + "</table></div>";
  } catch (e) {
    body.innerHTML = '<p class="muted">재판을 불러오지 못했어요.</p>';
  }
}

export function setupCompare() {
  const list = $("#trial-list"), go = $("#trials-compare");
  const picked = () => Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map((i) => /** @type {HTMLInputElement} */ (i).value);
  list.addEventListener("change", () => {
    const n = picked().length;
    go.disabled = n !== 2;
    go.textContent = n === 2 ? "두 재판 비교" : "두 개를 고르면 비교 (" + n + "/2)";
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
