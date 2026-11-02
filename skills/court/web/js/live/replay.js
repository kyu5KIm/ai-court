// @ts-check
// A saved trial.html: say how to question this trial, and link to the running courtroom if there is one.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { esc } from "../core/markdown.js";
import { t } from "../core/i18n.js";

const DEFAULT_SERVER = "http://127.0.0.1:8765/";

export function setupReplay() {
  const d = app.data;
  if (d.live || d.empty || !d.serve_command) return;
  const note = $("#ask-note");
  note.innerHTML = esc(t("replayNote")) + '<br><code class="replay-cmd">' + esc(d.serve_command) + "</code>" +
    ' <button type="button" class="tool" id="b-replay-copy">' + esc(t("replayCopy")) + "</button>";
  const copy = $("#b-replay-copy");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(String(d.serve_command));
      copy.textContent = t("replayCopied");
    } catch (e) {
      window.getSelection()?.selectAllChildren(note.querySelector("code"));
    }
  });
  // An opaque reply still proves something answers there; the page cannot read more across origins.
  fetch(DEFAULT_SERVER + "api/ping", { mode: "no-cors", cache: "no-store" }).then(() => {
    note.insertAdjacentHTML("beforeend", '<br><a href="' + DEFAULT_SERVER + "?run=" + encodeURIComponent(String(d.run || "")) + '">' + esc(t("replayLive")) + "</a>");
  }).catch(() => { /* no server running: the command above is the way */ });
}
