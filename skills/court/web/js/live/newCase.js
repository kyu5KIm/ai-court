// @ts-check
// File a new case from the page. The server opens the trial and runs it with `claude -p`.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { postJSON } from "./api.js";
import { t } from "../core/i18n.js";

/**
 * Open the new-case dialog, optionally filled in (a retrial passes the case, jury size and seed).
 * @param {{case?: string, jury?: number, seed?: string}} [prefill]
 */
export function openNewCase(prefill) {
  const dlg = $("#newcase");
  $("#nc-err").textContent = app.data.login === false ? t("loginTrial") : "";
  if (prefill && prefill.case != null) {
    $("#nc-case").value = prefill.case;
    const jury = $("#nc-jury");
    const size = String(prefill.jury || "");
    if (size && !Array.from(jury.options).some((/** @type {HTMLOptionElement} */ o) => o.value === size)) {
      jury.add(new Option(t("juryOption", size, Number(size) + 5), size));
    }
    if (size) jury.value = size;
    $("#nc-seed").value = prefill.seed || "";
  }
  if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  updateEstimate();
  const box = $("#nc-case");
  box.focus();
  if (prefill) { box.selectionStart = box.selectionEnd = box.value.length; box.scrollTop = box.scrollHeight; }
}

/** @param {number} n */
function roughTokens(n) {
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(n);
}

/**
 * A rough figure for the whole trial, fitted to five measured trials (3 and 6 jurors, input within about 10%):
 * the four statements come to about 3,600 tokens that every later call reads, and one web search costs about
 * 7,000 tokens of input on the side. Output counts the model's thinking, which swings several-fold from call to
 * call, so it is a range: the low end is what sonnet and opus wrote, the high end what haiku did.
 */
function updateEstimate() {
  const c = Math.round($("#nc-case").value.length / 2.5), n = Number($("#nc-jury").value) || 6;
  const statements = 3600;
  const research = $("#nc-research").checked ? 2 * 7000 : 0;
  const input = 2 * (450 + c) + 2 * (500 + c + 1200) + n * (550 + c + statements) + (650 + c + statements + n * 110) + research;
  const low = 2 * 2000 + 2 * 2000 + n * 500 + 3000;
  const high = 2 * 9000 + 2 * 7000 + n * 7000 + 9200;
  $("#nc-estimate").textContent = t("ncEstimate", roughTokens(input), roughTokens(low) + "~" + roughTokens(high));
}

function closeNewCase() {
  const dlg = $("#newcase");
  if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
}

export function setupNewCase() {
  for (const o of Array.from($("#nc-jury").options)) o.textContent = t("juryOption", o.value, Number(o.value) + 5);
  if (!app.data.live || !app.data.ask) return;
  const b = $("#b-new");
  b.hidden = false;
  b.addEventListener("click", () => openNewCase());
  $("#nc-cancel").addEventListener("click", closeNewCase);
  $("#nc-case").addEventListener("input", updateEstimate);
  $("#nc-jury").addEventListener("change", updateEstimate);
  $("#nc-research").addEventListener("change", updateEstimate);
  $("#nc-form").addEventListener("submit", async (/** @type {Event} */ e) => {
    e.preventDefault();
    const go = $("#nc-go"), err = $("#nc-err");
    go.disabled = true;
    err.textContent = "";
    try {
      const opened = await postJSON("api/trial", {
        case: $("#nc-case").value,
        jury: Number($("#nc-jury").value),
        jury_model: $("#nc-jury-model").value,
        seed: $("#nc-seed").value,
        research: $("#nc-research").checked,
      }, t("trialFail"));
      // The new trial, playing as it arrives. One waiting in line is not the latest yet, so ask for it by name.
      location.href = opened.queued ? "./?run=" + encodeURIComponent(opened.run) + "&play=1" : "./?play=1";
    } catch (x) {
      err.textContent = (x instanceof Error && x.message) || t("trialFail");
      go.disabled = false;
    }
  });
  if (app.data.empty) openNewCase();
}
