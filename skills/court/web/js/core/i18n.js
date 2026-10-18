// @ts-check
// Page text in Korean and English. The trial itself (statements, votes, judgment) stays as written.
import { loadPref } from "./prefs.js";
import { JUROR_KO } from "./constants.js";

/** The page language: "ko" (default) or "en", chosen with the EN / 한 button. */
export const lang = loadPref("lang", "ko") === "en" ? "en" : "ko";

/** @type {Record<string, [string, string]>} key: [Korean, English]; {0}, {1} are filled in by t(). */
const STR = {
  appName: ["AI 법정", "AI Court"],
  brand: ["COURT · AI 법정", "COURT · AI Court"],
  // header, footer
  noTrial: ["아직 열린 재판이 없어요", "No trial yet"],
  noCaseText: ["(사건 기록 없음)", "(no case file)"],
  footFolder: ["전체 기록 폴더: ", "Trial folder: "],
  footSeed: [" · 시드 ", " · seed "],
  footServe: ["<br>법정에 질문하려면 <code>python3 court.py serve</code>로 이 재판을 열어 주세요.",
    "<br>To question the court, open this trial with <code>python3 court.py serve</code>."],
  live: ["LIVE", "LIVE"],
  liveDone: ["재판 종료", "Trial over"],
  liveDoneAsk: ["재판 종료 · 질문 받는 중", "Trial over · taking questions"],
  viewingOld: ['지난 재판 · <a href="./">최신 재판 보기</a>', 'Earlier trial · <a href="./">see the latest</a>'],
  goTo: ["{0}(으)로 이동", "Go to {0}"],
  // roles and jurors
  judge: ["판사", "Judge"],
  prosecution: ["검사", "Prosecutor"],
  defense: ["변호인", "Defense"],
  clerk: ["서기", "Clerk"],
  jurorN: ["배심원 {0}", "Juror {0}"],
  jurorLabel: ["배심원 {0} · {1}", "Juror {0} · {1}"],
  // votes and verdicts
  guilty: ["유죄", "Guilty"],
  notGuilty: ["무죄", "Not guilty"],
  noVote: ["기권", "No vote"],
  hung: ["평결 불성립", "Hung jury"],
  hungShort: ["불성립", "Hung"],
  count: ["{0} 대 {1}", "{0} to {1}"],
  hungCount: ["유죄 {0} · 무죄 {1}", "guilty {0} · not guilty {1}"],
  verdictLead: ["배심원 평결", "The jury's verdict"],
  verdictWord: ["평결", "Verdict"],
  legend: ["유죄", "guilty"],
  legendN: ["무죄", "not guilty"],
  // scene tags and lines
  tagOpen: ["개정", "Court opens"],
  tagCharge: ["공소", "The charge"],
  tagOpening: ["모두진술", "Opening statement"],
  tagRebuttal: ["반박", "Rebuttal"],
  tagDeliberate: ["평의", "Deliberation"],
  tagSentence: ["선고", "Sentence"],
  tagClose: ["폐정", "Adjourned"],
  clerkOpen: ["<p>지금부터 재판을 시작합니다. 사건 기록을 읽겠습니다.</p>", "<p>The court is in session. I will read the case file.</p>"],
  judgeCharge: ["<p>이 안건이 적힌 그대로는 실패하며, 이대로 진행해서는 안 된다는 혐의입니다.</p><p>검사, 발언대로 나와 모두진술을 하세요.</p>",
    "<p>The charge: the case fails as stated and should not go ahead the way it is described.</p><p>Prosecutor, come to the lectern for your opening statement.</p>"],
  judgeRebuttal: ["<p>양측은 상대의 주장에 하나씩 답하세요. 검사부터 하세요.</p>", "<p>Each side, answer the other's points one by one. Prosecution first.</p>"],
  judgeDeliberate: ["<p>배심원은 각자 평의하세요. 서로의 표는 볼 수 없습니다.</p>", "<p>Jurors, deliberate on your own. You will not see each other's votes.</p>"],
  statementMissing: ['<p class="muted">(이 진술은 기록되지 않았어요)</p>', '<p class="muted">(This statement was not recorded.)</p>'],
  judgeMissing: ['<p class="muted">판사가 아직 판결문을 쓰지 않았어요.</p>', '<p class="muted">The judge has not written the judgment yet.</p>'],
  clerkClose: ["<p>이것으로 재판을 마칩니다. 전체 기록은 아래 폴더에 있어요.</p>", "<p>The court is adjourned. The full record is in this folder.</p>"],
  retrialButton: ["재심 열기", "Open a retrial"],
  retrialHint: ["무죄 조건을 붙여 같은 배심원 앞에서 다시 재판해요.", "Try the case again before the same jury, with the conditions for acquittal attached."],
  reason: ["이유", "Reason"],
  fact: ["결정적 사실", "Deciding fact"],
  flip: ["뒤집힐 조건", "Would flip if"],
  noVoteLeft: ["표를 남기지 않았어요", "Left no vote"],
  // player
  pause: ["⏸ 멈춤", "⏸ Pause"],
  replay: ["↺ 다시 보기", "↺ Watch again"],
  start: ["▶ 재판 시작", "▶ Start the trial"],
  play: ["▶ 재생", "▶ Play"],
  verdictReading: ["판사 · 평결 낭독", "Judge · reading the verdict"],
  waitingOpen: ["개정을 기다리는 중이에요", "Waiting for the court to open"],
  wholeRecord: ["재판 기록 전체", "The whole record"],
  stillRunning: ["아직 진행 중이에요", "Still running"],
  // live trial
  waitOpening: ["검사와 변호인이 모두진술을 준비하고 있어요", "Prosecution and defense are writing their openings"],
  waitRebuttal: ["양측이 반박을 준비하고 있어요", "Both sides are writing their rebuttals"],
  waitJury: ["배심원이 평의하고 있어요", "The jury is deliberating"],
  waitJudge: ["판사가 판결문을 쓰고 있어요", "The judge is writing the judgment"],
  inProgress: ["재판 진행 중", "Trial in progress"],
  waitingNext: ["다음 순서를 기다리는 중", "Waiting for the next part"],
  offline: ["서버와 연결이 끊겼어요", "Lost the connection to the server"],
  stopped: ["재판이 멈췄어요: {0}", "The trial stopped: {0}"],
  eta: ["판결까지 약 {0}", "about {0} to the verdict"],
  minutes: ["{0}분", "{0} min"],
  seconds: ["{0}초", "{0}s"],
  draftOpening: ["모두진술 작성 중", "writing the opening"],
  draftRebuttal: ["반박 작성 중", "writing the rebuttal"],
  draftJudge: ["판결문 작성 중", "writing the judgment"],
  notYet: ["아직 발언 전이에요", "Hasn't spoken yet"],
  seeWords: ["{0} 발언 보기", "{0}: see what they said"],
  // intro
  caseHead: ["사건", "The case"],
  introMeta: ["배심원 {0}명 · 검사와 변호인의 진술 4편 · 판결문 1편", "{0} jurors · 4 statements · 1 judgment"],
  introHint: ["스페이스: 재생/멈춤 · →: 다음 · Home: 처음부터", "Space: play/pause · →: next · Home: from the start"],
  emptyMeta: ["판단받고 싶은 아이디어나 계획을 접수하면 바로 재판이 열려요.", "File an idea or a plan you want judged and the trial starts right away."],
  fileCase: ["＋ 새 사건 접수", "＋ File a new case"],
  noCli: ["이 컴퓨터에서 claude 명령을 찾지 못해 여기서 재판을 열 수 없어요.", "The claude CLI was not found on this computer, so trials can't be opened here."],
  // questions
  me: ["나", "Me"],
  askedTo: ["{0}에게 질문", "to {0}"],
  answer: ["답변", "Answer"],
  emptyAnswer: ["(빈 답변)", "(empty answer)"],
  pastQuestions: ["이전에 한 질문 {0}개", "{0} earlier question(s)"],
  askOff: ["이 컴퓨터에서 claude 명령을 찾지 못해 질문은 꺼져 있어요.", "Questions are off: the claude CLI was not found on this computer."],
  loginAsk: ["질문에 답하려면 이 컴퓨터의 claude 명령이 로그인되어 있어야 해요. 터미널에서 claude auth login을 한 번 실행해 주세요.",
    "Answers need the claude CLI on this computer to be logged in. Run claude auth login once in a terminal."],
  askCost: ["질문 하나에 claude 호출이 한 번 들어요. 답은 이 재판 기록만 보고 해요.", "Each question is one claude call, answered from this trial's record only."],
  askFail: ["질문을 보내지 못했어요", "Could not send the question"],
  askWaiting: ["답을 기다리는 중이에요. 보통 10~30초쯤 걸려요.", "Waiting for the answer, usually 10 to 30 seconds."],
  chipWhy: ["왜 이런 평결이 나왔나요?", "Why this verdict?"],
  chipEasiest: ["가장 쉽게 해낼 수 있는 무죄 조건은 뭐예요?", "Which condition for acquittal is easiest to meet?"],
  chipWorst: ["가장 치명적인 약점 하나만 꼽는다면요?", "What is the single most damaging weakness?"],
  chipWin: ["어떻게 하면 이길 수 있었을까요?", "How could the defense have won?"],
  chipSummary: ["지금까지 재판을 세 줄로 요약해 주세요.", "Sum up the trial so far in three lines."],
  // new case, retrial
  loginTrial: ["재판을 열려면 이 컴퓨터의 claude 명령이 로그인되어 있어야 해요. 터미널에서 claude auth login을 한 번 실행해 주세요.",
    "Opening a trial needs the claude CLI on this computer to be logged in. Run claude auth login once in a terminal."],
  juryOption: ["{0}명 · claude 호출 {1}번", "{0} jurors · {1} claude calls"],
  trialFail: ["재판을 열지 못했어요", "Could not open the trial"],
  retrialHead: ["[재심] 지난 재판({0})에서 판사가 낸 무죄 조건:", "[Retrial] Conditions for acquittal the judge set in the earlier trial ({0}):"],
  retrialNone: ["(판결문에서 무죄 조건을 찾지 못했어요. 직접 적어 주세요.)", "(No conditions found in the judgment; please write them in.)"],
  retrialDone: ["위 조건 중 해낸 것과 그 결과:", "What I did about these, and what came of it:"],
  // past trials, comparison
  loading: ["불러오는 중…", "Loading…"],
  noVerdict: ["판결 없음", "no verdict"],
  running: ["진행 중", "running"],
  pickCompare: ["비교할 재판으로 고르기", "Pick for comparison"],
  latest: [" · 최신", " · latest"],
  viewing: [" · 보는 중", " · viewing"],
  noCase: ["(사건 없음)", "(no case)"],
  noTrials: ["아직 재판이 없어요.", "No trials yet."],
  listFail: ["목록을 불러오지 못했어요.", "Could not load the list."],
  cmpPending: ["아직 평결 전", "No verdict yet"],
  deliberating: ["평의 중", "deliberating"],
  changed: ["바뀜", "changed"],
  cmpChanged: ["표를 바꾼 배심원 {0}명", "{0} juror(s) changed their vote"],
  cmpNone: ["표를 바꾼 배심원은 없어요", "No juror changed their vote"],
  cmpDiffJury: [" · 두 재판의 배심원 구성이 달라요. 재심 때 같은 시드와 인원을 쓰면 같은 배심원이 앉아요.",
    " · The two juries are not the same people. A retrial with the same seed and size seats the same jury."],
  thJuror: ["배심원", "Juror"],
  thBefore: ["앞 재판", "Earlier"],
  thAfter: ["뒤 재판", "Later"],
  loadFail: ["재판을 불러오지 못했어요.", "Could not load the trials."],
  cmpGo: ["두 재판 비교", "Compare the two"],
  cmpPick: ["두 개를 고르면 비교 ({0}/2)", "Pick two to compare ({0}/2)"],
  // cost
  costTitle: ["비용과 시간", "Cost and time"],
  costTrial: ["재판 {0}", "trial {0}"],
  costCalls: ["호출 {0}번", "{0} calls"],
  costTokens: ["입력 {0} · 출력 {1} 토큰", "{0} tokens in · {1} out"],
  costQuestion: ["질문 · {0}", "Question · {0}"],
  thCall: ["호출", "Call"],
  thModel: ["모델", "Model"],
  thTime: ["시간", "Time"],
  thFirst: ["첫 글자", "First words"],
  thIn: ["입력", "In"],
  thOut: ["출력", "Out"],
  modelDefault: ["기본", "default"],
  // image
  imgLegend: ["■ 유죄   □ 무죄   (배심원 {0}명)", "■ guilty   □ not guilty   ({0} jurors)"],
  conditionsHead: ["무죄 조건", "Conditions for acquittal"],
  // tools
  soundOn: ["효과음 켜기", "Turn sound on"],
  soundOff: ["효과음 끄기", "Turn sound off"],
  themeAuto: ["화면: 시스템 설정", "Theme: system"],
  themeLight: ["화면: 밝게", "Theme: light"],
  themeDark: ["화면: 어둡게", "Theme: dark"],
  langSwitch: ["EN", "한"],
  langTitle: ["Switch to English", "한국어로 보기"],
  // static page text (index.html, data-i18n)
  kicker: ["COURT", "COURT"],
  courtroom: ["법정", "Courtroom"],
  benchPlate: ["판사", "Judge"],
  clerkPlate: ["서기", "Clerk"],
  prosPlate: ["검사", "Prosecutor"],
  defPlate: ["변호인", "Defense"],
  juryRail: ["배심원석", "Jury box"],
  scoreG: ["유죄", "Guilty"],
  scoreN: ["무죄", "Not guilty"],
  restartTitle: ["처음부터 (Home)", "From the start (Home)"],
  nextBtn: ["다음 ⏭", "Next ⏭"],
  nextTitle: ["다음 (→)", "Next (→)"],
  speedTitle: ["속도", "Speed"],
  allBtn: ["전부", "All"],
  allTitle: ["전체 기록 한 번에 보기", "Show the whole record at once"],
  timelineLabel: ["장면 이동", "Jump to a scene"],
  askWho: ["질문할 사람", "Who to ask"],
  askPlaceholder: ["법정에 질문하기…", "Ask the court…"],
  askLabel: ["질문", "Question"],
  askGo: ["묻기", "Ask"],
  trialsBtn: ["지난 재판", "Past trials"],
  retrialBtn: ["재심", "Retrial"],
  retrialTitle: ["무죄 조건을 붙여 다시 재판", "Try again with the conditions for acquittal"],
  imageBtn: ["평결 이미지", "Verdict image"],
  imageTitle: ["평결을 그림 파일로 저장", "Save the verdict as a picture"],
  printBtn: ["인쇄", "Print"],
  printTitle: ["판결문 인쇄", "Print the record"],
  helpTitle: ["단축키 (?)", "Shortcuts (?)"],
  helpLabel: ["단축키", "Shortcuts"],
  trialTools: ["재판 도구", "Trial tools"],
  viewTools: ["화면 설정", "View settings"],
  newCaseBtn: ["＋ 새 사건", "＋ New case"],
  costSummary: ["비용과 시간", "Cost and time"],
  helpHead: ["단축키", "Shortcuts"],
  keySpace: ["재생 / 멈춤", "Play / pause"],
  keyNext: ["다음 장면 (지금 장면은 바로 끝까지)", "Next scene (finishes the current one first)"],
  keyHome: ["처음부터", "From the start"],
  keyHelp: ["이 도움말", "This sheet"],
  keyEsc: ["열린 창 닫기", "Close a dialog"],
  keyPhone: ["휴대폰", "Phone"],
  keySwipe: ["화면을 왼쪽으로 밀면 다음 장면", "Swipe left for the next scene"],
  close: ["닫기", "Close"],
  trialsHead: ["지난 재판", "Past trials"],
  compareHead: ["재판 비교", "Compare trials"],
  ncHead: ["새 사건 접수", "File a new case"],
  ncHint: ["검사, 변호인, 배심원은 여기 적힌 내용만 알아요. 숫자로 적을수록 평결이 구체적이에요.",
    "The prosecutor, the defense and the jury know only what you write here. Numbers make the verdict concrete."],
  ncTip1: ["쓸 수 있는 돈과 시간", "Money and time you can spend"],
  ncTip2: ["지금까지 해 본 것과 그 결과", "What you have tried, and what happened"],
  ncTip3: ["누구를 상대로 하는지", "Who it is for"],
  ncTip4: ["가격, 기간, 규모", "Price, timeline, scale"],
  ncCaseLabel: ["사건 내용", "The case"],
  ncPlaceholder: ["예) 회사를 그만두고 온라인으로 수제 캔들을 파는 일을 전업으로 하려고 해. 저축은 800만 원, 3개월 동안 40개를 팔았고 한 개에 3만 원이야. 매달 생활비는 200만 원이야.",
    "e.g. I want to quit my job to sell handmade candles online full time. I have $6,000 saved, sold 40 candles in 3 months at $25 each, and spend $1,500 a month to live."],
  ncJury: ["배심원", "Jury"],
  ncJuryModel: ["배심원 모델", "Jury model"],
  ncSameModel: ["다른 역할과 같은 모델", "Same model as the other roles"],
  ncHaiku: ["haiku · 빠르고 적게 씀", "haiku · faster and lighter"],
  ncSeed: ["시드 (배심원 고정)", "Seed (fixes the jury)"],
  ncSeedPlaceholder: ["비워 두면 무작위", "Random if empty"],
  ncGo: ["재판 열기", "Open the trial"],
};

/** Phase chip names, in order (Scene.phase indexes this). */
export const PHASE_NAMES = lang === "en"
  ? ["Opens", "Statements", "Rebuttals", "Jury", "Verdict", "Sentence"]
  : ["개정", "모두진술", "반박", "평의", "평결", "선고"];

/** Juror groups for the vote map, matching LENS_GROUPS. */
export const GROUP_NAMES = lang === "en"
  ? ["Money", "Customers & market", "Execution", "Risk & rules"]
  : ["돈", "손님과 시장", "실행", "위험과 규칙"];

/**
 * The text for `key` in the page language, with {0}, {1} … replaced by `args`.
 * @param {string} key @param {...(string | number)} args
 */
export function t(key, ...args) {
  const pair = STR[key];
  const s = pair ? pair[lang === "en" ? 1 : 0] : key;
  return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

/** "judge" → 판사 / Judge; jurors as "배심원 3 · 회계사". @param {string} id */
export function roleName(id) {
  if (id.startsWith("juror-")) return t("jurorN", Number(id.split("-")[1]) + 1);
  return STR[id] ? t(id) : id;
}

/** A juror's display name: Korean from JUROR_KO, or the English name without "The". @param {string} name */
export function jurorName(name) {
  if (lang === "en") return name.replace(/^The\s+/, "");
  return JUROR_KO[name] ? JUROR_KO[name][0] : name;
}

/** What a juror looks at: the Korean lens, or the English one from jurors.json. @param {string} name @param {string} [lensEn] */
export function jurorLens(name, lensEn) {
  if (lang === "en") return lensEn || "";
  return JUROR_KO[name] ? JUROR_KO[name][1] : lensEn || "";
}

/** GUILTY → 유죄 / Guilty. @param {string} vote */
export function voteWord(vote) {
  return vote === "GUILTY" ? t("guilty") : vote === "NOT GUILTY" ? t("notGuilty") : t("noVote");
}

/** "20261012-204438" → "10월 12일 20:44" / "Oct 12, 20:44". @param {string} run */
export function runDate(run) {
  const m = run.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/);
  if (!m) return run;
  if (lang === "en") {
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1];
    return month + " " + Number(m[3]) + ", " + m[4] + ":" + m[5];
  }
  return Number(m[2]) + "월 " + Number(m[3]) + "일 " + m[4] + ":" + m[5];
}

/** Fill the static page text marked with data-i18n (text), -html, -placeholder, -title and -aria. */
export function applyI18n() {
  document.documentElement.lang = lang;
  document.title = t("appName");
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(/** @type {string} */ (el.getAttribute("data-i18n"))); });
  for (const [attr, prop] of [["data-i18n-placeholder", "placeholder"], ["data-i18n-title", "title"], ["data-i18n-aria", "aria-label"]]) {
    document.querySelectorAll("[" + attr + "]").forEach((el) => el.setAttribute(prop, t(/** @type {string} */ (el.getAttribute(attr)))));
  }
}
