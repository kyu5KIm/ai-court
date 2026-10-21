// @ts-check
// Small per-viewer preferences (theme, sound, language) kept in this browser.
// Storage can be blocked (private windows, file:// pages), so every access is guarded.

/** @param {string} key @param {string} fallback */
export function loadPref(key, fallback) {
  try {
    const v = window.localStorage.getItem("court." + key);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

/** @param {string} key @param {string} value */
export function savePref(key, value) {
  try {
    window.localStorage.setItem("court." + key, value);
  } catch (e) { /* not remembered; the choice still applies for this visit */ }
}
