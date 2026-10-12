// @ts-check
// Page header (case title, phase chips, LIVE badge) and the footer.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { PHASES } from "../core/constants.js";

/** The first line of the case file, or a placeholder. */
export function caseTitle() {
  if (app.data.empty) return "아직 열린 재판이 없어요";
  const first = String(app.data.case || "").split("\n").map((s) => s.trim()).filter(Boolean)[0];
  return (first || "(사건 기록 없음)").replace(/^#+\s*/, "");
}

export function renderHeader() {
  const d = app.data;
  $("#case-title").textContent = caseTitle();
  $("#phases").innerHTML = PHASES.map((p) => "<li>" + p + "</li>").join("");
  $("#foot").innerHTML = "전체 기록 폴더: " + esc(d.dir) + (d.seed != null ? " · 시드 " + esc(d.seed) : "") +
    '<br>Made with <a href="https://github.com/alexyc9381/court-skill">/court</a>, a free Claude Code skill by Alex Chen (@nocodealex).';
  if (!d.live) {
    $("#foot").insertAdjacentHTML("beforeend", "<br>법정에 질문하려면 <code>python3 court.py serve</code>로 이 재판을 열어 주세요.");
  }
}

/** Highlight the current phase chip; earlier ones read as done. @param {number} p */
export function setPhase(p) {
  Array.from($("#phases").children).forEach((li, i) => {
    li.classList.toggle("on", i === p);
    li.classList.toggle("done", i < p);
  });
}

/** "● LIVE" while a served trial runs, then "재판 종료". */
export function liveBadge() {
  const el = $("#live"), d = app.data;
  if (d.empty || !d.live) { el.textContent = ""; return; }
  el.textContent = d.finished ? (d.ask ? "● 재판 종료 · 질문 받는 중" : "● 재판 종료") : "● LIVE";
  el.classList.toggle("done", !!d.finished);
}
