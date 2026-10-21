// @ts-check
// Escaping and the small markdown subset the statements use: headings, lists, bold, code.
import { SECTION_KO } from "./constants.js";
import { lang } from "./i18n.js";

/** @param {unknown} s */
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    /** @type {Record<string, string>} */ ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** One line of text: escaped, with **bold** and `code`. @param {unknown} s */
export function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}

/**
 * Markdown to HTML. Judge headings in English get their Korean name, with the English beside it.
 * @param {string | null | undefined} text
 */
export function md(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  let html = "";
  /** @type {"ol" | "ul" | null} */
  let list = null;
  /** @type {string[]} */
  let para = [];
  const flushPara = () => {
    if (para.length) { html += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; }
  };
  const closeList = () => {
    if (list) { html += "</" + list + ">"; list = null; }
  };
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if (!l) { flushPara(); closeList(); continue; }
    if ((m = l.match(/^#{1,6}\s+(.*)$/))) {
      flushPara(); closeList();
      const h = m[1].replace(/\*\*/g, "").trim();
      const ko = lang === "ko" ? SECTION_KO[h.toLowerCase()] : "";  // English pages keep the judge's headings
      html += "<h4>" + esc(ko || h) + (ko ? ' <span class="en">' + esc(h) + "</span>" : "") + "</h4>";
      continue;
    }
    if ((m = l.match(/^(\d+)[.)]\s+(.*)$/))) {
      flushPara();
      if (list !== "ol") { closeList(); html += '<ol start="' + m[1] + '">'; list = "ol"; }
      html += "<li>" + inline(m[2]) + "</li>";
      continue;
    }
    if ((m = l.match(/^[-*•]\s+(.*)$/))) {
      flushPara();
      if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; }
      html += "<li>" + inline(m[1]) + "</li>";
      continue;
    }
    closeList();
    para.push(l);
  }
  flushPara();
  closeList();
  return html;
}
