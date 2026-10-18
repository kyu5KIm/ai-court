// @ts-check
// What a page-filed trial cost (time, tokens, calls, from runner.json), and a rough time-left estimate.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { t, roleName } from "../core/i18n.js";

const STAGE_KEY = /** @type {Record<string, string>} */ ({ opening: "tagOpening", rebuttal: "tagRebuttal", jury: "tagDeliberate", judge: "tagSentence" });

/** "jury/juror-03" → "평의 · 배심원 3". @param {string} key */
function callLabel(key) {
  const [phase, id] = key.split("/");
  const who = id.startsWith("juror-") ? t("jurorN", Number(id.split("-")[1])) : roleName(id);
  return (STAGE_KEY[phase] ? t(STAGE_KEY[phase]) : phase) + " · " + who;
}

/** @param {number} n */
function tokens(n) {
  return n >= 10000 ? (n / 1000).toFixed(0) + "k" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

/** @param {number} s */
function duration(s) {
  return s >= 90 ? t("minutes", Math.round(s / 60)) : t("seconds", Math.round(s));
}

/** @param {any} c  one call's cost */
function inputOf(c) {
  return (c.input || 0) + (c.cache_read || 0) + (c.cache_write || 0);
}

const costView = { key: "" };

/** Fill the cost panel from runner.json and the answered questions. Hidden for session-run trials. */
export function renderCost() {
  const d = app.data, panel = $("#cost");
  const calls = (d.runner && d.runner.calls) || {};
  const asked = (d.questions || []).filter((q) => q.cost);
  const order = ["opening", "rebuttal", "jury", "judge"];
  const keys = Object.keys(calls).sort((a, b) =>
    order.indexOf(a.split("/")[0]) - order.indexOf(b.split("/")[0]) || a.localeCompare(b));
  const key = JSON.stringify([keys.length, d.runner && d.runner.seconds, asked.length]);
  if (key === costView.key) return;
  costView.key = key;
  if (!keys.length && !asked.length) { panel.hidden = true; return; }

  const all = keys.map((k) => calls[k]).concat(asked.map((q) => q.cost));
  const totalIn = all.reduce((s, c) => s + inputOf(c), 0);
  const totalOut = all.reduce((s, c) => s + (c.output || 0), 0);
  const seconds = d.runner && d.runner.seconds;
  $("#cost-summary").textContent = t("costTitle") + " · " + [
    seconds ? t("costTrial", duration(seconds)) : "",
    t("costCalls", all.length),
    t("costTokens", tokens(totalIn), tokens(totalOut)),
  ].filter(Boolean).join(" · ");
  const rows = keys.map((k) => [callLabel(k), calls[k]])
    .concat(asked.map((q) => [t("costQuestion", q.q.slice(0, 18) + (q.q.length > 18 ? "…" : "")), q.cost]));
  $("#cost-table").innerHTML = "<tr>" + ["thCall", "thModel", "thTime", "thFirst", "thIn", "thOut"].map((k) => "<th>" + t(k) + "</th>").join("") + "</tr>" +
    rows.map(([label, c]) => "<tr><td>" + esc(label) + "</td><td>" + esc(c.model && c.model !== "default" ? c.model : t("modelDefault")) + "</td><td>" +
      (c.seconds != null ? t("seconds", c.seconds) : "") + "</td><td>" + (c.first_text != null ? t("seconds", c.first_text) : "") +
      "</td><td>" + tokens(inputOf(c)) + "</td><td>" + tokens(c.output || 0) + "</td></tr>").join("");
  panel.hidden = false;
}

/**
 * "판결까지 약 40초", from the average finished call and the calls still to come (in batches of 6, the
 * server default). Empty until a call has finished, since there is nothing to go on before that.
 */
export function etaText() {
  const d = app.data;
  if (!d.live || d.finished || !d.runner || d.runner.status !== "running") return "";
  const done = Object.values(d.runner.calls || {});
  if (!done.length) return "";
  const avg = done.reduce((s, c) => s + (c.seconds || 0), 0) / done.length;
  const left = [
    d.statements.slice(0, 2).filter((s) => !s.text).length,
    d.statements.slice(2, 4).filter((s) => !s.text).length,
    d.jurors.filter((j) => !j.voted).length,
    d.judge ? 0 : 1,
  ];
  const secs = left.reduce((s, n) => s + Math.ceil(n / 6) * avg, 0);
  if (secs < 3) return "";
  return t("eta", secs >= 90 ? t("minutes", Math.round(secs / 60)) : t("seconds", Math.max(5, Math.round(secs / 5) * 5)));
}
