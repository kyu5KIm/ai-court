// @ts-check
// While a live trial runs: the status pill, and "…" over whoever court.py is waiting on.
import { app, player, waitingForMore } from "../core/state.js";
import { $ } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { cast } from "../stage/cast.js";
import { setNow } from "../player/controls.js";
import { etaText } from "./cost.js";

/** @type {Record<string, string>} */
const WAIT_KEY = { opening: "waitOpening", rebuttal: "waitRebuttal", jury: "waitJury", judge: "waitJudge" };

export function waitingFx() {
  const st = $("#status"), d = app.data;
  for (const k in cast) cast[k].el.classList.remove("waiting");
  if (d.runner && d.runner.status === "error") {
    st.classList.add("on", "off");
    st.querySelector("span").textContent = t("stopped", d.runner.message);
    return;
  }
  if (!waitingForMore()) { st.classList.remove("on"); return; }
  st.classList.add("on");
  st.classList.toggle("off", !app.online);
  const eta = etaText();
  st.querySelector("span").textContent = app.online
    ? (WAIT_KEY[d.phase] ? t(WAIT_KEY[d.phase]) : t("inProgress")) + "…" + (eta ? " · " + eta : "")
    : t("offline");
  // Only while the replay has caught up with the record.
  if (player.cur || player.idx < player.scenes.length) return;
  if (d.phase === "opening" || d.phase === "rebuttal") {
    cast.prosecution.el.classList.add("waiting");
    cast.defense.el.classList.add("waiting");
  } else if (d.phase === "judge") {
    cast.judge.el.classList.add("waiting");
  }
  if (player.idx > 0) setNow((WAIT_KEY[d.phase] ? t(WAIT_KEY[d.phase]) : t("waitingNext")) + "…", true);
}
