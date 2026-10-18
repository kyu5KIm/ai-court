// @ts-check
// While a served trial streams, show the statement being written before it is finished.
import { app, player, waitingForMore } from "../core/state.js";
import { md, esc } from "../core/markdown.js";
import { cast, spotlight, talking } from "../stage/cast.js";
import { say } from "../stage/bubble.js";
import { logEl, avatar, nearBottom, follow } from "../transcript/messages.js";
import { t } from "../core/i18n.js";

/**
 * The pieces the replay waits on, in order. Juror drafts are not shown: votes are revealed one by one.
 * @type {{key: string, actor: string, name: string, tag: string, side: string, tone: import("../types.js").Tone}[]}
 */
const DRAFT_SLOTS = [
  { key: "opening/prosecution", actor: "prosecution", name: t("prosecution"), tag: t("draftOpening"), side: "left", tone: "pros" },
  { key: "opening/defense", actor: "defense", name: t("defense"), tag: t("draftOpening"), side: "right", tone: "def" },
  { key: "rebuttal/prosecution", actor: "prosecution", name: t("prosecution"), tag: t("draftRebuttal"), side: "left", tone: "pros" },
  { key: "rebuttal/defense", actor: "defense", name: t("defense"), tag: t("draftRebuttal"), side: "right", tone: "def" },
  { key: "judge/judge", actor: "judge", name: t("judge"), tag: t("draftJudge"), side: "center judge", tone: "" },
];

/** The draft message on screen, if any. @type {{key: string, text: string, el: HTMLElement | null}} */
const draftView = { key: "", text: "", el: null };

/** The next piece the replay is waiting for, or null (jury voting, or nothing left). */
function nextSlot() {
  const d = app.data;
  for (let i = 0; i < 4; i++) if (!d.statements[i].text) return DRAFT_SLOTS[i];
  if (d.jurors.some((j) => !j.voted)) return null;
  return d.judge ? null : DRAFT_SLOTS[4];
}

/** The end of the last line written, for the speech bubble. @param {string} text */
function draftTail(text) {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  const line = (lines[lines.length - 1] || "").replace(/[#*`>_]/g, "").replace(/^\s*\d+[.)]\s*/, "").trim();
  return line.length > 40 ? "…" + line.slice(-40) : line;
}

/** Remove the draft message and stop its speaker. */
export function clearDraft() {
  if (!draftView.el) return;
  draftView.el.remove();
  draftView.el = null;
  draftView.key = draftView.text = "";
  talking(null, false);
  spotlight(null);
  say(null);
}

/** Show, update or remove the draft after new data arrives. */
export function updateDraft() {
  const d = app.data;
  const caughtUp = !player.cur && player.idx >= player.scenes.length && waitingForMore();
  const slot = caughtUp ? nextSlot() : null;
  const text = slot && d.drafts ? d.drafts[slot.key] || "" : "";
  if (!slot || !text.trim()) { clearDraft(); return; }

  const stick = nearBottom();
  if (!draftView.el || draftView.key !== slot.key) {
    clearDraft();
    const el = document.createElement("article");
    el.className = "msg draft typing " + slot.side;
    el.innerHTML = "<header>" + avatar(slot.actor) + "<b>" + esc(slot.name) + '</b><span class="tag">' +
      esc(slot.tag) + '</span></header><div class="body"></div>';
    logEl().appendChild(el);
    draftView.el = el;
    draftView.key = slot.key;
  }
  const speaker = cast[slot.actor];
  speaker.el.classList.remove("waiting");  // talking, not thinking
  if (text === draftView.text) return;
  draftView.text = text;
  /** @type {HTMLElement} */ (draftView.el.querySelector(".body")).innerHTML = md(text);
  spotlight(slot.actor);
  talking(slot.actor, true);
  say(speaker, draftTail(text), slot.tone);
  follow(draftView.el, stick);
}
