// @ts-check
// Questions to anyone in the courtroom: the ask box, the Q&A in the transcript, and the answer on stage.
import { app, player } from "../core/state.js";
import { $, replayAnimation } from "../core/dom.js";
import { esc, inline, md } from "../core/markdown.js";
import { cast, jurors, spotlight, talking } from "../stage/cast.js";
import { say } from "../stage/bubble.js";
import { measure } from "../stage/layout.js";
import { logEl, avatar, follow } from "../transcript/messages.js";
import { postJSON } from "./api.js";

/**
 * Rendered Q&A pairs by question id. `fresh` ones were asked on this page and get a stage reaction.
 * @type {{els: Record<string, {a: HTMLElement, fresh: boolean, filled: boolean}>, reactTimer: number}}
 */
const qa = { els: {}, reactTimer: 0 };

/** @param {string} who */
function whoName(who) {
  if (who.startsWith("juror-")) {
    const i = Number(who.split("-")[1]);
    return "배심원 " + (i + 1) + " · " + (jurors[i] && jurors[i].info ? jurors[i].info[0] : "");
  }
  return /** @type {Record<string, string>} */ ({ judge: "판사", prosecution: "검사", defense: "변호인", clerk: "서기" })[who] || who;
}

/**
 * @param {import("../types.js").Question} q @param {boolean} fresh @param {HTMLElement} [parent]
 */
function addQA(q, fresh, parent) {
  const box = parent || logEl();
  const u = document.createElement("article");
  u.className = "msg user";
  u.innerHTML = '<header><b>나</b><span class="tag">' + esc(whoName(q.who)) + "에게 질문</span></header>" +
    '<div class="body"><p>' + inline(q.q) + "</p></div>";
  const a = document.createElement("article");
  a.className = "msg center answer typing";
  a.innerHTML = "<header>" + avatar(q.who) + "<b>" + esc(whoName(q.who)) +
    '</b><span class="tag">답변</span></header><div class="body"></div>';
  box.appendChild(u);
  box.appendChild(a);
  const e = { a, fresh, filled: false };
  qa.els[q.id] = e;
  if (q.status !== "pending") fillAnswer(e, q);
  if (fresh) follow(a, true);
  return e;
}

/** @param {{a: HTMLElement, filled: boolean}} e @param {import("../types.js").Question} q */
function fillAnswer(e, q) {
  e.filled = true;
  e.a.classList.remove("typing");
  e.a.classList.toggle("err", q.status === "error");
  /** @type {HTMLElement} */ (e.a.querySelector(".body")).innerHTML = md(q.answer) || '<p class="muted">(빈 답변)</p>';
}

/** Questions asked before this page loaded, folded away under the intro. */
export function renderPast() {
  qa.els = {};
  const qs = app.data.questions || [];
  if (!qs.length) return;
  const d = document.createElement("details");
  d.className = "past";
  d.innerHTML = "<summary>이전에 한 질문 " + qs.length + "개</summary>";
  const box = document.createElement("div");
  box.className = "qa";
  d.appendChild(box);
  logEl().appendChild(d);
  qs.forEach((q) => addQA(q, false, box));
}

/** The person asked answers on stage, unless a scene is playing. @param {import("../types.js").Question} q */
function react(q) {
  const c = cast[q.who];
  if (player.cur || !c || q.status !== "done") return;
  clearTimeout(qa.reactTimer);
  spotlight(q.who);
  talking(q.who, true);
  if (c.kind === "juror") replayAnimation(c.el, "hop");
  say(c, q.answer.replace(/[#*`>_]/g, ""), q.who === "prosecution" ? "pros" : q.who === "defense" ? "def" : "");
  qa.reactTimer = window.setTimeout(() => {
    if (!player.cur) { talking(null, false); say(null); spotlight(null); }
  }, 7000);
}

/** Apply the latest question list from the server. */
export function syncQuestions() {
  for (const q of app.data.questions || []) {
    const e = qa.els[q.id] || addQA(q, true);
    if (q.status !== "pending" && !e.filled) {
      fillAnswer(e, q);
      if (e.fresh) {
        follow(e.a, true);
        react(q);
        $("#ask-note").textContent = "";
        measure();
      }
    }
  }
}

export function setupAsk() {
  const d = app.data, form = $("#ask"), note = $("#ask-note");
  if (!d.live || d.empty) return;
  if (!d.ask) { note.textContent = "이 컴퓨터에서 claude 명령을 찾지 못해 질문은 꺼져 있어요."; return; }
  const options = [["judge", "판사"], ["prosecution", "검사"], ["defense", "변호인"], ["clerk", "서기"]]
    .concat(jurors.map((c, i) => ["juror-" + i, "배심원 " + (i + 1) + " · " + (c.info ? c.info[0] : "")]));
  $("#ask-who").innerHTML = options.map((o) => '<option value="' + o[0] + '">' + esc(o[1]) + "</option>").join("");
  form.classList.add("on");
  note.textContent = d.login === false
    ? "질문에 답하려면 이 컴퓨터의 claude 명령이 로그인되어 있어야 해요. 터미널에서 claude auth login을 한 번 실행해 주세요."
    : "질문 하나에 claude 호출이 한 번 들어요. 답은 이 재판 기록만 보고 해요.";
  form.addEventListener("submit", async (/** @type {Event} */ e) => {
    e.preventDefault();
    const input = $("#ask-q"), text = input.value.trim(), who = $("#ask-who").value, btn = $("#ask-go");
    if (!text) return;
    btn.disabled = true;
    try {
      const j = await postJSON("api/ask", { who, q: text }, "질문을 보내지 못했어요");
      input.value = "";
      note.textContent = "답을 기다리는 중이에요. 보통 10~30초쯤 걸려요.";
      if (!qa.els[j.id]) addQA({ id: j.id, who, q: text, status: "pending", answer: "" }, true);
    } catch (err) {
      note.textContent = (err instanceof Error && err.message) || "질문을 보내지 못했어요";
    }
    btn.disabled = false;
    measure();
  });
}
