// @ts-check
// Fixed tables and numbers the page uses.

/** Korean name and lens for each juror in jurors.json. @type {Record<string, [string, string]>} */
export const JUROR_KO = {
  "The Accountant": ["회계사", "돈이 어디서 나와서 어디로 가는지 따져요. 출처 없는 숫자는 믿지 않아요."],
  "The First-Time Customer": ["처음 온 고객", "오늘 처음 들었는데, 이번 주에 이 가격에 정말 쓸지 봐요."],
  "The Competitor": ["경쟁자", "내일 이걸 본다면 따라 할지, 이길지, 무시할지 봐요."],
  "The Retired Judge": ["은퇴한 판사", "증거가 기록에 실제로 있는지, 바람을 사실처럼 쓴 건지 봐요."],
  "The Teenager": ["십대", "솔직하고 쉽게 질려요. 누가 관심이나 가질지 봐요."],
  "The Engineer": ["엔지니어", "실제로 만들 수 있는지, 커지면 무엇이 먼저 깨지는지 봐요."],
  "The Small-Business Owner": ["동네 가게 사장님", "월요일 아침에 누가 일하고, 돈이 들어오기 전 현금은 어디서 나오는지 봐요."],
  "The Statistician": ["통계학자", "이런 계획이 실제로 성공하는 비율과 표본 크기를 봐요."],
  "The Parent": ["부모", "가족의 시간과 돈과 안전을 지켜 줄 만큼 믿을 수 있는지 봐요."],
  "The Investor": ["투자자", "얻을 것과 잃을 것을 견주어, 내 돈을 이대로 넣을지 봐요."],
  "The Designer": ["디자이너", "처음 보는 사람이 5초 안에 이게 뭔지 알아듣는지 봐요."],
  "The Lawyer": ["변호사", "기록에 없는 법적·규제상의 함정이 있는지 봐요."],
};

/** Jurors grouped by what they look at, for the vote map (labels: GROUP_NAMES in i18n.js). @type {[string, string[]][]} */
export const LENS_GROUPS = [
  ["money", ["The Accountant", "The Investor", "The Statistician"]],
  ["market", ["The First-Time Customer", "The Competitor", "The Teenager", "The Designer"]],
  ["execution", ["The Engineer", "The Small-Business Owner"]],
  ["risk", ["The Retired Judge", "The Parent", "The Lawyer"]],
];

/** Hat colours, one per juror seat. */
export const HATS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6",
  "#64748b", "#6366f1", "#84cc16", "#0ea5e9", "#a855f7", "#e11d48"];

/** @type {Record<string, string>} */
export const VOTE_CLS = { "GUILTY": "g", "NOT GUILTY": "n", "NO VOTE": "" };

/** The judge writes English section headings; show them in Korean. @type {Record<string, string>} */
export const SECTION_KO = {
  "charges that stuck": "인정된 혐의",
  "what the defense got right": "변호인이 맞힌 점",
  "conditions for acquittal": "무죄 조건",
  "the sentence": "선고",
};

export const ORANGE = "#D97757";
export const INK = "#1a1410";

/** Where a speaker stands to talk, in % of the scene. */
export const LECTERN = { x: 50, y: 61 };

export const SPEEDS = [1, 1.5, 2, 3];
/** How long a walk to or from the lectern takes at 1×. */
export const WALK_MS = 1100;
/** How often the live page asks the server for news. */
export const POLL_MS = 1500;
