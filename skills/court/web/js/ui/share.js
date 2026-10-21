// @ts-check
// Save the verdict as a picture (PNG), drawn on a canvas: no library, nothing leaves the computer.
import { app } from "../core/state.js";
import { $ } from "../core/dom.js";
import { LENS_GROUPS } from "../core/constants.js";
import { t, GROUP_NAMES } from "../core/i18n.js";
import { caseTitle } from "../header/header.js";
import { verdictParts } from "../player/scenes.js";

const SERIF = '"Noto Serif KR","Nanum Myeongjo","Batang","AppleMyungjo",serif';
const SANS = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';

/** Every juror has voted, so there is a verdict to save. */
function hasVerdict() {
  const js = app.data.jurors || [];
  return !app.data.empty && js.length > 0 && js.every((j) => j.voted);
}

/** The judge's "Conditions for acquittal" items, plain text. */
export function acquittalConditions() {
  const out = [];
  let inside = false;
  for (const raw of String(app.data.judge || "").split("\n")) {
    const l = raw.trim();
    // Judges word this heading freely: "Conditions for acquittal", "무죄 조건", "무죄로 바뀔 조건 3가지"...
    if (/^#{1,6}\s/.test(l)) { inside = /acquittal|무죄.{0,8}조건/i.test(l); continue; }
    const m = inside && l.match(/^(?:\d+[.)]|[-*•])\s+(.*)$/);
    if (m) out.push(m[1].replace(/\*\*/g, "").replace(/`/g, "").trim());
  }
  return out;
}

/**
 * Lines of `text` that fit `width` at the context's current font, at most `max` lines.
 * @param {CanvasRenderingContext2D} g @param {string} text @param {number} width @param {number} max
 */
function wrapText(g, text, width, max) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (g.measureText(line + ch).width > width && line) {
      lines.push(line);
      line = ch.trim() ? ch : "";
      if (lines.length === max) break;
    } else {
      line += ch;
    }
  }
  if (lines.length < max && line) lines.push(line);
  if (lines.length === max && (lines.join("").length < text.length)) lines[max - 1] = lines[max - 1].slice(0, -1) + "…";
  return lines;
}

/** Draw the verdict card. @returns {HTMLCanvasElement} */
export function drawVerdict() {
  const W = 1080, H = 1440, P = 80;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
  const v = verdictParts();
  const tone = v[2] === "g" ? "#9c2a22" : v[2] === "n" ? "#2e6e48" : "#6b6157";

  g.fillStyle = "#f4eee3";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#7a4e2b";
  g.fillRect(0, 0, W, 18);

  g.fillStyle = "#74685a";
  g.font = "600 30px " + SANS;
  g.fillText(t("brand"), P, 100);

  g.fillStyle = "#2a2118";
  g.font = "700 50px " + SERIF;
  let y = 180;
  for (const line of wrapText(g, caseTitle(), W - 2 * P, 3)) { g.fillText(line, P, y); y += 66; }

  // The stamp.
  y += 70;
  g.save();
  g.translate(W / 2, y + 120);
  g.rotate(-0.12);
  g.strokeStyle = tone;
  g.fillStyle = tone;
  g.lineWidth = 12;
  g.strokeRect(-300, -120, 600, 240);
  g.textAlign = "center";
  g.font = "800 150px " + SERIF;
  g.fillText(v[0], 0, 45);
  g.font = "700 40px " + SANS;
  g.fillText(v[1], 0, 100);
  g.restore();
  y += 330;

  // The vote map.
  const byName = new Map(app.data.jurors.map((j) => [j.juror, j]));
  g.font = "600 30px " + SANS;
  for (const [gi, [, names]] of LENS_GROUPS.entries()) {
    const group = GROUP_NAMES[gi];
    const here = names.filter((n) => byName.has(n));
    if (!here.length) continue;
    g.fillStyle = "#74685a";
    g.fillText(group, P, y + 30);
    here.forEach((n, i) => {
      const j = byName.get(n), x = P + 250 + i * 54;
      g.lineWidth = 4;
      g.strokeStyle = tone;
      g.fillStyle = tone;
      if (j && j.vote === "GUILTY") g.fillRect(x, y, 38, 38);
      else if (j && j.vote === "NOT GUILTY") g.strokeRect(x + 2, y + 2, 34, 34);
      else { g.setLineDash([6, 6]); g.strokeRect(x + 2, y + 2, 34, 34); g.setLineDash([]); }
    });
    y += 58;
  }
  g.fillStyle = "#74685a";
  g.font = "26px " + SANS;
  g.fillText(t("imgLegend", app.data.jurors.length), P, y + 24);
  y += 80;

  // Conditions for acquittal.
  const conditions = acquittalConditions().slice(0, 3);
  if (conditions.length) {
    g.fillStyle = "#2a2118";
    g.font = "700 36px " + SERIF;
    g.fillText(t("conditionsHead"), P, y);
    y += 52;
    g.font = "30px " + SANS;
    conditions.forEach((c, i) => {
      const lines = wrapText(g, (i + 1) + ". " + c, W - 2 * P, 2);
      for (const line of lines) { if (y < H - 120) g.fillText(line, P, y); y += 42; }
      y += 8;
    });
  }

  g.fillStyle = "#74685a";
  g.font = "24px " + SANS;
  g.fillText("/court skill by Alex Chen (@nocodealex) · github.com/alexyc9381/court-skill", P, H - 60);
  return canvas;
}

function saveVerdictImage() {
  drawVerdict().toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = String(app.data.dir || "").split(/[\\/]/).pop() || "trial";
    a.href = url;
    a.download = "verdict-" + stamp + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}

/** Show the button once the verdict is in. */
export function updateShareButton() {
  $("#b-image").hidden = !hasVerdict();
}

export function setupShare() {
  $("#b-image").addEventListener("click", saveVerdictImage);
  updateShareButton();
}
