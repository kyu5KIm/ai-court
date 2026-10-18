// @ts-check
// Ready-made questions above the ask box: one tap fills in who and what, and sends it.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { t } from "../core/i18n.js";

/** `after`: only once the judgment is in. @type {{who: string, q: string, after?: boolean}[]} */
const CHIPS = [
  { who: "judge", q: t("chipWhy"), after: true },
  { who: "judge", q: t("chipEasiest"), after: true },
  { who: "prosecution", q: t("chipWorst") },
  { who: "defense", q: t("chipWin") },
  { who: "clerk", q: t("chipSummary") },
];

const chipView = { finished: /** @type {boolean | null} */ (null) };

/** Show the chips that fit the trial right now. */
export function renderChips() {
  const d = app.data, box = $("#ask-chips");
  if (!d.live || d.empty || !d.ask) { box.hidden = true; return; }
  if (chipView.finished === !!d.finished) return;
  chipView.finished = !!d.finished;
  box.innerHTML = CHIPS.filter((c) => !c.after || d.finished).map((c) =>
    '<button type="button" class="chip" data-i="' + CHIPS.indexOf(c) + '">' + esc(c.q) + "</button>").join("");
  box.hidden = false;
}

export function setupChips() {
  renderChips();
  $("#ask-chips").addEventListener("click", (e) => {
    const b = e.target instanceof Element ? e.target.closest("button.chip") : null;
    if (!(b instanceof HTMLElement)) return;
    const chip = CHIPS[Number(b.dataset.i)];
    $("#ask-who").value = chip.who;
    $("#ask-q").value = chip.q;
    $("#ask").requestSubmit();
  });
}
