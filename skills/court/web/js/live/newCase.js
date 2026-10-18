// @ts-check
// File a new case from the page. The server opens the trial and runs it with `claude -p`.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { postJSON } from "./api.js";

const LOGIN_NEEDED = "재판을 열려면 이 컴퓨터의 claude 명령이 로그인되어 있어야 해요. 터미널에서 claude auth login을 한 번 실행해 주세요.";

/**
 * Open the new-case dialog, optionally filled in (a retrial passes the case, jury size and seed).
 * @param {{case?: string, jury?: number, seed?: string}} [prefill]
 */
export function openNewCase(prefill) {
  const dlg = $("#newcase");
  $("#nc-err").textContent = app.data.login === false ? LOGIN_NEEDED : "";
  if (prefill && prefill.case != null) {
    $("#nc-case").value = prefill.case;
    const jury = $("#nc-jury");
    const size = String(prefill.jury || "");
    if (size && !Array.from(jury.options).some((/** @type {HTMLOptionElement} */ o) => o.value === size)) {
      jury.add(new Option(size + "명 · claude 호출 " + (Number(size) + 5) + "번", size));
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
      }, "재판을 열지 못했어요");
      location.href = "./?play=1";  // the new trial, playing as it arrives
    } catch (x) {
      err.textContent = (x instanceof Error && x.message) || "재판을 열지 못했어요";
      go.disabled = false;
    }
  });
  if (app.data.empty) openNewCase();
}
