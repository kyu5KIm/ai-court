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
  const box = $("#nc-case");
  box.focus();
  if (prefill) { box.selectionStart = box.selectionEnd = box.value.length; box.scrollTop = box.scrollHeight; }
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
  $("#nc-form").addEventListener("submit", async (/** @type {Event} */ e) => {
    e.preventDefault();
    const go = $("#nc-go"), err = $("#nc-err");
    go.disabled = true;
    err.textContent = "";
    try {
      await postJSON("api/trial", {
        case: $("#nc-case").value,
        jury: Number($("#nc-jury").value),
        jury_model: $("#nc-jury-model").value,
        seed: $("#nc-seed").value,
      }, t("trialFail"));
      location.href = "./?play=1";  // the new trial, playing as it arrives
    } catch (x) {
      err.textContent = (x instanceof Error && x.message) || t("trialFail");
      go.disabled = false;
    }
  });
  if (app.data.empty) openNewCase();
}
