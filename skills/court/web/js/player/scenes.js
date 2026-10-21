// @ts-check
// Turns the trial record into the list of scenes the player steps through.
import { app } from "../core/state.js";
import { md, esc, inline } from "../core/markdown.js";
import { VOTE_CLS, LENS_GROUPS } from "../core/constants.js";
import { t, voteWord, jurorName, GROUP_NAMES } from "../core/i18n.js";
import { jurors } from "../stage/cast.js";
import { raiseSign, setScore, verdictFx, parkStamp } from "../stage/effects.js";
import { retrialOffered } from "../live/retrial.js";

/** @returns {import("../types.js").VerdictParts} */
export function verdictParts() {
  const { guilty: g, not_guilty: n, verdict } = app.data;
  if (verdict === "GUILTY") return [t("guilty"), t("count", g, n), "g"];
  if (verdict === "NOT GUILTY") return [t("notGuilty"), t("count", n, g), "n"];
  return [t("hung"), t("hungCount", g, n), "h"];
}

/** The verdict card's vote map: one square per juror, grouped by the kind of thing they look at. */
function voteMap() {
  const byName = new Map(app.data.jurors.map((j) => [j.juror, j]));
  const rows = LENS_GROUPS.map(([, names], gi) => {
      const group = GROUP_NAMES[gi];
    const here = names.filter((n) => byName.has(n));
    if (!here.length) return "";
    return '<div class="vm-row"><span class="vm-k">' + esc(group) + "</span>" + here.map((n) => {
      const j = /** @type {import("../types.js").JurorRecord} */ (byName.get(n));
      const label = jurorName(n) + " · " + voteWord(j.vote);
      return '<span class="vm ' + (VOTE_CLS[j.vote] || "x") + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"></span>';
    }).join("") + "</div>";
  }).join("");
  return rows ? '<div class="votemap">' + rows +
    '<div class="vm-legend"><span class="vm g"></span>' + t("legend") + ' <span class="vm n"></span>' + t("legendN") + '</div></div>' : "";
}

/**
 * One juror stands up with their vote.
 * @param {import("../types.js").JurorRecord} j @param {number} i
 * @param {number} guilty @param {number} notGuilty  running totals after this vote
 * @returns {import("../types.js").Scene}
 */
function jurorScene(j, i, guilty, notGuilty) {
  const c = jurors[i], cls = VOTE_CLS[j.vote] || "";
  const info = c.info || ["", ""];
  let rows = "";
  if (j.reason) rows += '<div class="line"><span class="k">' + t("reason") + '</span><span>' + inline(j.reason) + "</span></div>";
  if (j.fact) rows += '<div class="line"><span class="k">' + t("fact") + '</span><span>' + inline(j.fact) + "</span></div>";
  if (j.flip) rows += '<div class="line"><span class="k">' + t("flip") + '</span><span>' + inline(j.flip) + "</span></div>";
  if (!rows) rows = '<div class="line"><span class="k"></span><span class="muted">' + t("noVoteLeft") + '</span></div>';
  return {
    phase: 3, actor: "juror-" + i, side: "center juror " + cls,
    name: t("jurorLabel", i + 1, info[0]),
    badge: '<span class="vote ' + cls + '">' + voteWord(j.vote) + "</span>",
    lens: info[1], html: rows, pause: 900,
    enter: (instant) => {
      raiseSign(c, cls, voteWord(j.vote), instant);
      setScore(guilty, notGuilty, !instant);
    },
  };
}

/**
 * Every scene the record supports so far. On a live trial the list stops at the first piece that has
 * not been written yet, so a later call only ever appends scenes.
 * @returns {import("../types.js").Scene[]}
 */
export function buildScenes() {
  const d = app.data;
  /** @type {import("../types.js").Scene[]} */
  const S = [];
  const complete = !d.live || d.finished;
  if (d.empty) return S;

  /** @param {number} phase @param {string} tag @param {string} html @param {Partial<import("../types.js").Scene>} [extra] */
  const judge = (phase, tag, html, extra) =>
    S.push({ phase, actor: "judge", side: "center judge", name: t("judge"), tag, html, ...extra });

  S.push({ phase: 0, actor: "clerk", side: "center", name: t("clerk"), tag: t("tagOpen"),
    html: t("clerkOpen") + "<blockquote>" + md(d.case) + "</blockquote>" });
  judge(0, t("tagCharge"), t("judgeCharge"));

  for (let i = 0; i < d.statements.length; i++) {
    const s = d.statements[i], pros = s.side === "prosecution";
    if (i === 2) judge(2, t("tagRebuttal"), t("judgeRebuttal"), { pause: 700 });
    if (!s.text && !complete) return S;
    S.push({
      phase: s.phase === "opening" ? 1 : 2, actor: s.side, walks: true, tone: pros ? "pros" : "def",
      side: pros ? "left" : "right", name: pros ? t("prosecution") : t("defense"),
      tag: s.phase === "opening" ? t("tagOpening") : t("tagRebuttal"),
      html: s.text ? md(s.text) : t("statementMissing"),
    });
  }

  judge(3, t("tagDeliberate"), t("judgeDeliberate"), {
    enter: () => jurors.forEach((c) => c.el.classList.add("thinking")),
    pause: 1600,
  });
  let g = 0, n = 0;
  for (let i = 0; i < d.jurors.length; i++) {
    const j = d.jurors[i];
    if (!j.voted && !complete) return S;
    if (j.vote === "GUILTY") g++; else if (j.vote === "NOT GUILTY") n++;
    S.push(jurorScene(j, i, g, n));
  }

  const v = verdictParts();
  S.push({
    phase: 4, actor: "judge", kind: "verdict", hold: 2800, verdict: v,
    html: '<div class="lead">' + t("verdictLead") + '</div><div class="v">' + v[0] + '</div><div class="count">' + v[1] + "</div>" + voteMap(),
    enter: (instant) => verdictFx(v, instant),
    after: parkStamp,
  });
  if (!d.judge && !complete) return S;
  judge(5, t("tagSentence"), d.judge ? md(d.judge) : t("judgeMissing"));
  S.push({ phase: 5, actor: "clerk", side: "center", name: t("clerk"), tag: t("tagClose"),
    html: t("clerkClose") + '<p class="path"><code>' + esc(d.dir) + "</code></p>" +
      (retrialOffered() ? '<p class="action"><button type="button" class="primary" data-action="retrial">' + t("retrialButton") +
        '</button> <span class="muted">' + t("retrialHint") + '</span></p>' : "") });
  return S;
}
