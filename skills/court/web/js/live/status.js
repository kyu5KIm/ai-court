// @ts-check
// While a live trial runs: the status pill, and "…" over whoever court.py is waiting on.
import { app, player, waitingForMore } from "../core/state.js";
import { $ } from "../core/dom.js";
import { WAIT_KO } from "../core/constants.js";
import { cast } from "../stage/cast.js";
import { setNow } from "../player/controls.js";

export function waitingFx() {
  const st = $("#status"), d = app.data;
  for (const k in cast) cast[k].el.classList.remove("waiting");
  if (d.runner && d.runner.status === "error") {
    st.classList.add("on", "off");
    st.querySelector("span").textContent = "재판이 멈췄어요: " + d.runner.message;
    return;
  }
  if (!waitingForMore()) { st.classList.remove("on"); return; }
  st.classList.add("on");
  st.classList.toggle("off", !app.online);
  st.querySelector("span").textContent = app.online ? (WAIT_KO[d.phase] || "재판 진행 중") + "…" : "서버와 연결이 끊겼어요";
  // Only while the replay has caught up with the record.
  if (player.cur || player.idx < player.scenes.length) return;
  if (d.phase === "opening" || d.phase === "rebuttal") {
    cast.prosecution.el.classList.add("waiting");
    cast.defense.el.classList.add("waiting");
  } else if (d.phase === "judge") {
    cast.judge.el.classList.add("waiting");
  }
  if (player.idx > 0) setNow((WAIT_KO[d.phase] || "다음 순서를 기다리는 중") + "…", true);
}
