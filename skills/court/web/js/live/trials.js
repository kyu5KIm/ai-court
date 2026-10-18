// @ts-check
// Past trials: a list of every trial in .court/ (newest first), each one openable with ?run=NAME.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { fetchTrials } from "./api.js";

/** "20261012-204438" → "10월 12일 20:44". @param {string} run */
export function runDate(run) {
  const m = run.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/);
  return m ? Number(m[2]) + "월 " + Number(m[3]) + "일 " + m[4] + ":" + m[5] : run;
}

/** @param {any} t  one entry from /api/trials */
export function verdictBadge(t) {
  if (!t.verdict) return '<span class="badge">' + (t.finished ? "판결 없음" : "진행 중") + "</span>";
  const cls = t.verdict === "GUILTY" ? "g" : t.verdict === "NOT GUILTY" ? "n" : "";
  const word = t.verdict === "GUILTY" ? "유죄" : t.verdict === "NOT GUILTY" ? "무죄" : "불성립";
  return '<span class="badge ' + cls + '">' + word + " " + t.guilty + ":" + t.not_guilty + "</span>";
}

/** The trial this page shows, as a /api/trials name. */
export function viewedRun() {
  return app.run || String(app.data.run || "");
}

async function openTrials() {
  const dlg = $("#trials"), list = $("#trial-list");
  list.innerHTML = '<li class="muted">불러오는 중…</li>';
  if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  try {
    const trials = await fetchTrials();
    const here = viewedRun();
    list.innerHTML = trials.length ? trials.map((t) =>
      '<li class="trial' + (t.run === here ? " here" : "") + '">' +
      '<label class="pick"><input type="checkbox" value="' + esc(t.run) + '" aria-label="비교할 재판으로 고르기"></label>' +
      '<a href="./?run=' + encodeURIComponent(t.run) + '">' +
      '<span class="when">' + esc(runDate(t.run)) + (t.latest ? " · 최신" : "") + (t.run === here ? " · 보는 중" : "") + "</span>" +
      '<span class="what">' + esc(t.case || "(사건 없음)") + "</span></a>" + verdictBadge(t) + "</li>").join("")
      : '<li class="muted">아직 재판이 없어요.</li>';
  } catch (e) {
    list.innerHTML = '<li class="muted">목록을 불러오지 못했어요.</li>';
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
    v.innerHTML = '지난 재판 · <a href="./">최신 재판 보기</a>';
    v.hidden = false;
  }
}
