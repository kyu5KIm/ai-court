// @ts-check
// Entry point. court.py puts the trial record into #court-data and joins these modules into one script.
import { app, player } from "./core/state.js";
import { $ } from "./core/dom.js";
import { renderHeader, setPhase, liveBadge } from "./header/header.js";
import { buildCast } from "./stage/cast.js";
import { setupCharacterPick } from "./stage/pick.js";
import { watchLayout } from "./stage/layout.js";
import { buildScenes } from "./player/scenes.js";
import { setPlaying } from "./player/player.js";
import { bindControls, setSpeed } from "./player/controls.js";
import { renderIntro } from "./transcript/intro.js";
import { waitingFx } from "./live/status.js";
import { setupAsk } from "./live/questions.js";
import { setupNewCase } from "./live/newCase.js";
import { startPolling } from "./live/poll.js";
import { setupTheme } from "./ui/theme.js";
import { setupHelp } from "./ui/help.js";
import { setupPrint } from "./ui/print.js";
import { setupSound } from "./ui/sound.js";

function boot() {
  app.data = JSON.parse($("#court-data").textContent);
  app.token = app.data.token || "";

  setupTheme();
  renderHeader();
  buildCast();
  setupCharacterPick();
  player.scenes = buildScenes();
  renderIntro();
  setPhase(-1);
  bindControls();
  setSpeed(1);
  setupAsk();
  setupNewCase();
  setupHelp();
  setupPrint();
  setupSound();
  liveBadge();
  waitingFx();
  watchLayout();

  // Opened right after filing a case: play the new trial as it arrives.
  if (/[?&]play=1/.test(location.search)) {
    try { history.replaceState(null, "", location.pathname); } catch (e) { /* file:// pages can't */ }
    if (!app.data.empty) setPlaying(true);
  }
  startPolling();
}

boot();
