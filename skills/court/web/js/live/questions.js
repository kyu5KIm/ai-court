// @ts-check
// Questions to anyone in the courtroom: the ask box, the Q&A in the transcript, and the answer on stage.
import { app, player } from "../core/state.js";
import { $, replayAnimation } from "../core/dom.js";
import { esc, inline, md } from "../core/markdown.js";
import { cast, jurors, spotlight, talking } from "../stage/cast.js";
import { say } from "../stage/bubble.js";
import { measure } from "../stage/layout.js";
import { logEl, avatar, follow, nearBottom } from "../transcript/messages.js";
import { postJSON } from "./api.js";
import { t, roleName } from "../core/i18n.js";

/**
 * Rendered Q&A pairs by question id. `fresh` ones were asked on this page and get a stage reaction.
 * @type {{els: Record<string, {a: HTMLElement, fresh: boolean, filled: boolean, partial: string}>, reactTimer: number}}
 */
const qa = { els: {}, reactTimer: 0 };

/** @param {string} who */
function whoName(who) {
  if (who.startsWith("juror-")) {
    const i = Number(who.split("-")[1]);
    return t("jurorLabel", i + 1, jurors[i] && jurors[i].info ? jurors[i].info[0] : "");
  }
  return roleName(who);
}

/**
 * @param {import("../types.js").Question} q @param {boolean} fresh @param {HTMLElement} [parent]
 */
function addQA(q, fresh, parent) {
  const box = parent || logEl();
  const u = document.createElement("article");
  u.className = "msg user";
  u.innerHTML = '<header><b>' + t("me") + '</b><span class="tag">' + esc(t("askedTo", whoName(q.who))) + "</span></header>" +
    '<div class="body"><p>' + inline(q.q) + "</p></div>";
  const a = document.createElement("article");
  a.className = "msg center answer typing";
  a.dataset.actor = q.who;
  a.innerHTML = "<header>" + avatar(q.who) + "<b>" + esc(whoName(q.who)) +
    '</b><span class="tag">' + t("answer") + '</span></header><div class="body"></div>';
  box.appendChild(u);
  box.appendChild(a);
  const e = { a, fresh, filled: false, partial: "" };
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
  /** @type {HTMLElement} */ (e.a.querySelector(".body")).innerHTML = md(q.answer) || '<p class="muted">' + t("emptyAnswer") + "</p>";
}

/** Questions asked before this page loaded, folded away under the intro. */
export function renderPast() {
  qa.els = {};
  const qs = app.data.questions || [];
  if (!qs.length) return;
  const d = document.createElement("details");
  d.className = "past";
  d.innerHTML = "<summary>" + t("pastQuestions", qs.length) + "</summary>";
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
    if (q.status === "pending" && q.answer && q.answer !== e.partial) {
      // The answer so far, while claude is still writing it.
      const stick = nearBottom();
      e.partial = q.answer;
      /** @type {HTMLElement} */ (e.a.querySelector(".body")).innerHTML = md(q.answer);
      if (e.fresh) follow(e.a, stick);
    }
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
  if (!d.ask) { note.textContent = t("askOff"); return; }
  const options = ["judge", "prosecution", "defense", "clerk"].map((id) => [id, roleName(id)])
    .concat(jurors.map((c, i) => ["juror-" + i, t("jurorLabel", i + 1, c.info ? c.info[0] : "")]));
  $("#ask-who").innerHTML = options.map((o) => '<option value="' + o[0] + '">' + esc(o[1]) + "</option>").join("");
  form.classList.add("on");
  note.textContent = d.login === false
    ? t("loginAsk")
    : t("askCost");
  form.addEventListener("submit", async (/** @type {Event} */ e) => {
    e.preventDefault();
    const input = $("#ask-q"), text = input.value.trim(), who = $("#ask-who").value, btn = $("#ask-go");
    if (!text) return;
    btn.disabled = true;
    try {
      const j = await postJSON("api/ask", { who, q: text }, t("askFail"));
      input.value = "";
      note.textContent = t("askWaiting");
      if (!qa.els[j.id]) addQA({ id: j.id, who, q: text, status: "pending", answer: "" }, true);
    } catch (err) {
      note.textContent = (err instanceof Error && err.message) || t("askFail");
    }
    btn.disabled = false;
    measure();
  });
}
