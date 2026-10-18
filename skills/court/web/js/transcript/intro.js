// @ts-check
// The card at the top of the transcript: the case and a start button, or an empty-court notice.
import { app } from "../core/state.js";
import { esc } from "../core/markdown.js";
import { sprite } from "../stage/sprite.js";
import { caseTitle } from "../header/header.js";
import { logEl } from "./messages.js";
import { setPlaying } from "../player/player.js";
import { openNewCase } from "../live/newCase.js";
import { renderPast } from "../live/questions.js";

const CAST_ROW = () =>
  '<div class="cast">' + sprite("prosecution") + sprite("judge", undefined, "big") + sprite("defense") + "</div>";

export function renderIntro() {
  const d = app.data, el = document.createElement("div");
  el.className = "intro";
  if (d.empty) {
    el.innerHTML = CAST_ROW() + '<h2>AI 법정</h2><p class="case">아직 열린 재판이 없어요</p>' +
      (d.ask
        ? '<p class="meta">판단받고 싶은 아이디어나 계획을 접수하면 바로 재판이 열려요.</p><button class="primary" id="b-intro-new">＋ 새 사건 접수</button>'
        : '<p class="meta">이 컴퓨터에서 claude 명령을 찾지 못해 여기서 재판을 열 수 없어요.</p>');
    logEl().appendChild(el);
    const b = el.querySelector("#b-intro-new");
    if (b) b.addEventListener("click", () => openNewCase());
    return;
  }
  el.innerHTML = CAST_ROW() + '<h2>사건</h2><p class="case">' + esc(caseTitle()) + "</p>" +
    '<p class="meta">배심원 ' + d.jurors.length + "명 · 검사와 변호인의 진술 4편 · 판결문 1편</p>" +
    '<button class="primary" id="b-intro">▶ 재판 시작</button>' +
    '<p class="hint">스페이스: 재생/멈춤 · →: 다음 · Home: 처음부터</p>';
  logEl().appendChild(el);
  /** @type {HTMLElement} */ (el.querySelector("#b-intro")).addEventListener("click", () => setPlaying(true));
  renderPast();
}

/** Hide the intro's start button once the trial is underway. */
export function markIntroStarted() {
  const intro = document.querySelector(".intro");
  if (intro) intro.classList.add("started");
}
