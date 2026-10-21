// @ts-check
// Shared JSDoc types. Nothing here runs: modules refer to these with import("../types.js").Name,
// so this file is never part of the joined page script.

/** @typedef {"GUILTY" | "NOT GUILTY" | "NO VOTE"} Vote */
/** @typedef {"opening" | "rebuttal" | "jury" | "judge" | "done" | "none"} Phase */
/** @typedef {"judge" | "clerk" | "prosecution" | "defense" | "juror"} CharKind */
/** @typedef {"pros" | "def" | ""} Tone */
/** @typedef {[label: string, count: string, cls: "g" | "n" | "h"]} VerdictParts */

/**
 * @typedef {object} Statement
 * @property {"opening" | "rebuttal"} phase
 * @property {"prosecution" | "defense"} side
 * @property {string} text
 */

/**
 * @typedef {object} JurorRecord
 * @property {string} juror     English juror name from jurors.json
 * @property {Vote} vote
 * @property {string} reason
 * @property {string} fact
 * @property {string} flip
 * @property {string} lens
 * @property {boolean} voted    false while the juror's file is not written yet
 */

/**
 * @typedef {object} Question
 * @property {string} id
 * @property {string} who       "judge" | "prosecution" | "defense" | "clerk" | "juror-<i>"
 * @property {string} q
 * @property {"pending" | "done" | "error"} status
 * @property {string} answer
 * @property {any} [cost]  the answering call's time and tokens
 */

/**
 * @typedef {object} Runner
 * @property {"running" | "done" | "error"} status
 * @property {string} message
 * @property {number | null} [seconds]  time since the trial started
 * @property {Record<string, any>} [calls]  per call: seconds, first_text, input, cache_read, cache_write, output, model
 */

/**
 * Everything court.py knows about the trial (trial_data() plus what `serve` adds).
 * @typedef {object} CourtData
 * @property {boolean} [empty]   true when `serve` has no trial yet
 * @property {string} verdict
 * @property {number} guilty
 * @property {number} not_guilty
 * @property {string} case
 * @property {string} judge
 * @property {Statement[]} statements
 * @property {JurorRecord[]} jurors
 * @property {Phase} phase
 * @property {boolean} finished
 * @property {Question[]} [questions]
 * @property {Runner | null} [runner]
 * @property {Record<string, string>} [drafts]  replies still being written, by "<phase>/<job id>"
 * @property {string} dir
 * @property {number | null} [seed]
 * @property {boolean} live      true when served by `court.py serve`
 * @property {boolean} [ask]     the claude CLI was found
 * @property {boolean} [login]   the claude CLI is logged in
 * @property {string} [token]    sent back with every POST
 */

/** @typedef {{x: number, y: number}} Pos */

/**
 * @typedef {object} Character
 * @property {string} id
 * @property {CharKind} kind
 * @property {HTMLElement} el
 * @property {Pos} home
 * @property {Pos} pos
 * @property {string} [hat]
 * @property {number} walkTimer
 * @property {[string, string]} [info]  Korean name and lens, for jurors
 */

/**
 * One step of the replay.
 * @typedef {object} Scene
 * @property {number} phase           index into PHASES
 * @property {string} actor           character id
 * @property {string} html            message body
 * @property {string} [side]          message classes: left | right | center ...
 * @property {string} [name]
 * @property {string} [tag]
 * @property {string} [badge]
 * @property {string} [lens]
 * @property {Tone} [tone]
 * @property {boolean} [walks]        the speaker walks to the lectern and back
 * @property {"verdict"} [kind]
 * @property {VerdictParts} [verdict]
 * @property {number} [hold]          extra ms to stay on a scene with nothing to reveal
 * @property {number} [pause]         ms before the next scene
 * @property {(instant: boolean) => void} [enter]
 * @property {() => void} [after]
 */

/**
 * The scene being revealed.
 * @typedef {object} Current
 * @property {Scene} sc
 * @property {HTMLElement} el
 * @property {HTMLElement[]} items
 * @property {number} i
 * @property {boolean} held
 */

export {};
