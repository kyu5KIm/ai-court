// @ts-check
// Follow a served trial: ask the server for the record every few seconds and apply what is new.
import { app } from "../core/state.js";
import { POLL_MS } from "../core/constants.js";
import { liveBadge } from "../header/header.js";
import { mergeScenes } from "../player/player.js";
import { fetchState } from "./api.js";
import { syncQuestions } from "./questions.js";
import { waitingFx } from "./status.js";
import { updateDraft } from "./draft.js";
import { renderChips } from "./chips.js";
import { renderCost } from "./cost.js";
import { updateShareButton } from "../ui/share.js";
import { updateRetrialButton } from "./retrial.js";

async function pollOnce() {
  try {
    const next = await fetchState();
    if (next.dir !== app.data.dir) { location.reload(); return; }  // a new trial opened
    app.online = true;
    app.data = next;
    mergeScenes();
    syncQuestions();
    renderChips();
    renderCost();
    updateShareButton();
    updateRetrialButton();
    liveBadge();
    updateDraft();
  } catch (e) {
    app.online = false;
    waitingFx();
  }
  window.setTimeout(pollOnce, POLL_MS);
}

export function startPolling() {
  if (app.data.live) window.setTimeout(pollOnce, POLL_MS);
}
