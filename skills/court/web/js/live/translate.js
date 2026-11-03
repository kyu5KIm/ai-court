// @ts-check
// See a finished trial's own text in the page language. The server translates once and keeps the result.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { lang, t } from "../core/i18n.js";
import { loadPref, savePref } from "../core/prefs.js";
import { postJSON } from "./api.js";

/** The language the case is written in, judged by how much of it is Hangul. @param {string} text */
function writtenIn(text) {
  const letters = text.replace(/[^A-Za-z\uAC00-\uD7A3]/g, "");
  const hangul = letters.replace(/[A-Za-z]/g, "").length;
  return letters.length && hangul / letters.length > 0.1 ? "ko" : "en";
}

function wanted() {
  return loadPref("translated", "") === "1";
}

/**
 * The trial data with the translated text swapped in, if the viewer asked for it and it exists.
 * @param {import("../types.js").CourtData} d @returns {import("../types.js").CourtData}
 */
export function withTranslation(d) {
  const tr = d.translations && d.translations[lang];
  if (!wanted() || !tr || tr.status !== "done" || writtenIn(d.case || "") === lang) return d;
  const docs = tr.docs;
  return Object.assign({}, d, {
    source: { case: d.case, judge: d.judge },
    case: docs.case || d.case,
    judge: docs.judge || d.judge,
    statements: d.statements.map((s) => Object.assign({}, s, { text: docs[s.phase + "/" + s.side] || s.text })),
    jurors: d.jurors.map((j, i) => Object.assign({}, j, (docs.jurors && docs.jurors[i]) || {})),
  });
}

/** Fit the button to where the translation stands. */
export function updateTranslateButton() {
  const d = app.data, b = $("#b-translate");
  const original = d.source ? d.source.case : d.case;
  const tr = d.translations && d.translations[lang];
  const ready = !!(tr && tr.status === "done");
  b.hidden = !d.finished || d.empty || writtenIn(original || "") === lang || !(ready || (d.live && d.ask));
  if (b.hidden) return;
  const running = !!(tr && tr.status === "running");
  b.disabled = running;
  b.title = ready ? "" : t("translateTitle");
  const failed = !!(tr && tr.status === "error");
  b.textContent = running ? t("translating") : d.source ? t("translated") : ready ? t("translatedShow") :
    failed ? t("translateRetry") : t("translateTo");
  if (failed) {
    b.title = t("translateFail", tr.message || "");
    if (asked.pending) {
      asked.pending = false;
      const st = $("#status");
      st.classList.add("on", "off");
      st.querySelector("span").textContent = t("translateFail", tr.message || "");
    }
  }
  if (ready && asked.pending) {
    asked.pending = false;
    savePref("translated", "1");
    location.reload();
  }
}

const asked = { pending: false };

export function setupTranslate() {
  $("#b-translate").addEventListener("click", async () => {
    const tr = app.data.translations && app.data.translations[lang];
    if (tr && tr.status === "done") {
      savePref("translated", wanted() ? "" : "1");
      location.reload();
      return;
    }
    if (!window.confirm(t("translateConfirm"))) return;
    asked.pending = true;
    $("#b-translate").disabled = true;
    $("#b-translate").textContent = t("translating");
    try {
      await postJSON("api/translate", { lang }, t("runFail"));
    } catch (e) {
      asked.pending = false;
      $("#b-translate").disabled = false;
      $("#b-translate").title = (e instanceof Error && e.message) || t("runFail");
    }
  });
  updateTranslateButton();
}
