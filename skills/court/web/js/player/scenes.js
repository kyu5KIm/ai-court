// @ts-check
// Turns the trial record into the list of scenes the player steps through.
import { app } from "../core/state.js";
import { md, esc, inline } from "../core/markdown.js";
import { VOTE_KO, VOTE_CLS, JUROR_KO, LENS_GROUPS } from "../core/constants.js";
import { jurors } from "../stage/cast.js";
import { raiseSign, setScore, verdictFx, parkStamp } from "../stage/effects.js";
import { retrialOffered } from "../live/retrial.js";

/** @returns {import("../types.js").VerdictParts} */
export function verdictParts() {
  const { guilty: g, not_guilty: n, verdict } = app.data;
  if (verdict === "GUILTY") return ["유죄", g + " 대 " + n, "g"];
  if (verdict === "NOT GUILTY") return ["무죄", n + " 대 " + g, "n"];
  return ["평결 불성립", "유죄 " + g + " · 무죄 " + n, "h"];
}

/** The verdict card's vote map: one square per juror, grouped by the kind of thing they look at. */
function voteMap() {
  const byName = new Map(app.data.jurors.map((j) => [j.juror, j]));
  const rows = LENS_GROUPS.map(([group, names]) => {
    const here = names.filter((n) => byName.has(n));
    if (!here.length) return "";
    return '<div class="vm-row"><span class="vm-k">' + esc(group) + "</span>" + here.map((n) => {
      const j = /** @type {import("../types.js").JurorRecord} */ (byName.get(n));
      const label = (JUROR_KO[n] ? JUROR_KO[n][0] : n) + " · " + (VOTE_KO[j.vote] || j.vote);
      return '<span class="vm ' + (VOTE_CLS[j.vote] || "x") + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"></span>';
    }).join("") + "</div>";
  }).join("");
  return rows ? '<div class="votemap">' + rows +
    '<div class="vm-legend"><span class="vm g"></span>유죄 <span class="vm n"></span>무죄</div></div>' : "";
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
  if (j.reason) rows += '<div class="line"><span class="k">이유</span><span>' + inline(j.reason) + "</span></div>";
  if (j.fact) rows += '<div class="line"><span class="k">결정적 사실</span><span>' + inline(j.fact) + "</span></div>";
  if (j.flip) rows += '<div class="line"><span class="k">뒤집힐 조건</span><span>' + inline(j.flip) + "</span></div>";
  if (!rows) rows = '<div class="line"><span class="k"></span><span class="muted">표를 남기지 않았어요</span></div>';
  return {
    phase: 3, actor: "juror-" + i, side: "center juror " + cls,
    name: "배심원 " + (i + 1) + " · " + info[0],
    badge: '<span class="vote ' + cls + '">' + (VOTE_KO[j.vote] || j.vote) + "</span>",
    lens: info[1], html: rows, pause: 900,
    enter: (instant) => {
      raiseSign(c, cls, VOTE_KO[j.vote] || "기권", instant);
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
    S.push({ phase, actor: "judge", side: "center judge", name: "판사", tag, html, ...extra });

  S.push({ phase: 0, actor: "clerk", side: "center", name: "서기", tag: "개정",
    html: "<p>지금부터 재판을 시작합니다. 사건 기록을 읽겠습니다.</p><blockquote>" + md(d.case) + "</blockquote>" });
  judge(0, "공소", "<p>이 안건이 적힌 그대로는 실패하며, 이대로 진행해서는 안 된다는 혐의입니다.</p><p>검사, 발언대로 나와 모두진술을 하세요.</p>");

  for (let i = 0; i < d.statements.length; i++) {
    const s = d.statements[i], pros = s.side === "prosecution";
    if (i === 2) judge(2, "반박", "<p>양측은 상대의 주장에 하나씩 답하세요. 검사부터 하세요.</p>", { pause: 700 });
    if (!s.text && !complete) return S;
    S.push({
      phase: s.phase === "opening" ? 1 : 2, actor: s.side, walks: true, tone: pros ? "pros" : "def",
      side: pros ? "left" : "right", name: pros ? "검사" : "변호인", tag: s.phase === "opening" ? "모두진술" : "반박",
      html: s.text ? md(s.text) : '<p class="muted">(이 진술은 기록되지 않았어요)</p>',
    });
  }

  judge(3, "평의", "<p>배심원은 각자 평의하세요. 서로의 표는 볼 수 없습니다.</p>", {
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
    html: '<div class="lead">배심원 평결</div><div class="v">' + v[0] + '</div><div class="count">' + v[1] + "</div>" + voteMap(),
    enter: (instant) => verdictFx(v, instant),
    after: parkStamp,
  });
  if (!d.judge && !complete) return S;
  judge(5, "선고", d.judge ? md(d.judge) : '<p class="muted">판사가 아직 판결문을 쓰지 않았어요.</p>');
  S.push({ phase: 5, actor: "clerk", side: "center", name: "서기", tag: "폐정",
    html: '<p>이것으로 재판을 마칩니다. 전체 기록은 아래 폴더에 있어요.</p><p class="path"><code>' + esc(d.dir) + "</code></p>" +
      (retrialOffered() ? '<p class="action"><button type="button" class="primary" data-action="retrial">재심 열기</button> ' +
        '<span class="muted">무죄 조건을 붙여 같은 배심원 앞에서 다시 재판해요.</span></p>' : "") });
  return S;
}
