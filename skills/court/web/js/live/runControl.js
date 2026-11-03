// @ts-check
// Stop a running trial, or pick a stopped one up again. Both only touch the parts not finished yet.
import { app, stoppedEarly, waitingForMore } from "../core/state.js";
import { $ } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { postJSON } from "./api.js";
import { waitingFx } from "./status.js";

/** Show the button that fits the trial's state. */
export function updateRunButtons() {
  const d = app.data, r = d.runner;
  const running = !!(d.live && r && ["running", "queued"].includes(r.status) && waitingForMore());
  $("#b-stop").hidden = !running;
  $("#b-resume").hidden = !(d.live && d.ask && stoppedEarly());
  if (!running) { $("#b-stop").disabled = false; $("#b-stop").textContent = t("stopBtn"); }
}

/** @param {string} path */
async function send(path) {
  try {
    await postJSON(path, {}, t("runFail"));
  } catch (e) {
    const st = $("#status");
    st.classList.add("on", "off");
    st.querySelector("span").textContent = (e instanceof Error && e.message) || t("runFail");
  }
}

export function setupRunControl() {
  $("#b-stop").addEventListener("click", async () => {
    if (!window.confirm(t("stopConfirm"))) return;
    // Stay on this trial: the next one in line becomes the latest the moment this one stops.
    if (!app.run && app.data.run) {
      app.run = String(app.data.run);
      try { history.replaceState(null, "", "?run=" + encodeURIComponent(app.run)); } catch (e) { /* file:// */ }
    }
    $("#b-stop").disabled = true;
    $("#b-stop").textContent = t("stopping");
    await send("api/cancel");
  });
  $("#b-resume").addEventListener("click", async () => {
    $("#b-resume").disabled = true;
    await send("api/resume");
    $("#b-resume").disabled = false;
  });
  updateRunButtons();
  waitingFx();
}
