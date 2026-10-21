# AI Court · court-skill, Korean edition

[한국어](README.md) | **English**

> A modified version of [alexyc9381/court-skill](https://github.com/alexyc9381/court-skill).
> The original is by **Alex Chen** ([@nocodealex](https://instagram.com/nocodealex)) and is MIT licensed.
> The trial itself (a prosecutor, a defense, jurors who never see each other's votes, a judge) is unchanged;
> this edition adds Korean-environment fixes and a web courtroom.

Ask Claude "is this a good idea?" and it usually says "Great idea!". `/court` puts the same idea on trial instead.
A prosecutor Claude argues why it fails, a defense Claude argues why it works, juror Claudes with different
jobs and points of view vote guilty or not guilty without seeing each other's votes, and a judge Claude sums
up what would have to change to flip the votes.

## What is different from the original

| What | Details |
| --- | --- |
| Korean Windows fix | The original reads files with the OS default encoding, so on Korean Windows (cp949) a Korean case file crashes at once with `UnicodeDecodeError`. Every file is now read and written as UTF-8. |
| Courtroom page | The trial plays out in a courtroom of moving pixel characters. The prosecution and defense walk to the lectern and speak in speech bubbles, jurors raise vote signs one by one, the gavel falls and the verdict is stamped. The full record reads below as a conversation. |
| Live updates | Open the court with `court.py serve` and the page keeps playing as statements and votes are written to disk. |
| New cases from the page | File a case with the **＋ New case** button and the server calls the prosecutor, defense, jurors and judge in turn with `claude -p` and runs the trial to the end. No need to go back to the Claude Code chat. |
| Questions for the court | During or after a trial, ask the judge, the prosecutor, the defense, the clerk or any juror a question. They answer from that trial's record only. |
| Answer language | Sub-agents are told to write in the language of the case file. Write the case in Korean and the statements and judgment come back in Korean. |
| Drafts while writing | For trials filed from the page, statements and the judgment show as "writing" drafts before they are finished. Question answers fill in as they are written too. |
| Faster and lighter | Page-filed trials and questions use a short system prompt of their own, sending about 9,100 fewer tokens per call. Jurors can run on a faster model (haiku), and you can set how many calls run at once. Each call's time and tokens are kept in `runner.json`. |
| Page extras | Past trials and a side-by-side comparison, a retrial button, a scene timeline, click-a-character, suggested questions, a cost and time panel, a vote map by juror group, verdict image export, print, light/dark, sound effects and an English page. See "What you can do on the courtroom page" below. |

## Install

Paste this into Claude Code:

```
https://github.com/kyu5KIm/ai-court
Install this skill, then confirm /court works.
```

Or copy it yourself:

```bash
git clone https://github.com/kyu5KIm/ai-court
cp -r ai-court/skills/court ~/.claude/skills/
```

In Windows Explorer, copying the `ai-court\skills\court` folder into `<your user folder>\.claude\skills\` does the
same. The skill runs its helper with `python3`, so Python 3 is required.

## How to use it

### 1. Open a trial from the chat

```
/court --quick Quit my job to sell handmade candles online full time. I have $6,000 saved, sold 40 candles in 3 months at $25 each, and spend $1,500 a month to live.
```

| Option | Meaning |
| --- | --- |
| (none) | 12 jurors, 17 sub-agent calls |
| `--quick` | 6 jurors, 11 sub-agent calls |
| `--jury N` | 3 to 12 jurors |
| `--seed S` | Fixes which jurors sit on a smaller jury |

The jurors know only what you write. The more you put in numbers (money and time you can spend, what you have
tried and what happened, who it is for, price and timeline), the more concrete the verdict. A trial writes
several files, so turning on accept-edits mode (Shift+Tab) saves you from approving each one.

When a trial opens, Claude also starts the courtroom server and gives you `http://127.0.0.1:8765/`. When the
trial ends, the verdict `VERDICT.md` and a replay page `trial.html` are saved in `.court/<date-time>/`.

### 2. Open a trial straight from the web courtroom

```bash
python3 ~/.claude/skills/court/court.py serve
```

Open `http://127.0.0.1:8765/` in a browser and press **＋ New case**. Trial records collect in `.court/` inside
the folder where you ran the command. This route and the questions use the `claude` command installed on your
computer, so log in once first:

```bash
claude auth login
```

### Commands

| Command | What it does |
| --- | --- |
| `court.py serve [--port P] [--model M] [--jury-model J] [--parallel N]` | The live courtroom server. Takes new cases and questions. |
| `court.py run [--model M] [--jury-model J] [--parallel N]` | Runs the latest trial opened with `init` to the end with `claude -p`. |
| `court.py render` | Counts the votes and writes `VERDICT.md` and `trial.html`. |
| `court.py plan / init / next / prompts / check / tally` | The original bookkeeping commands that drive a trial. |

| Option | Meaning |
| --- | --- |
| `--model M` | The model every role uses. Leave it out for `claude`'s default model. |
| `--jury-model J` | A model for the jurors only (for example `haiku`). Also selectable as "Jury model" in the new-case dialog. |
| `--parallel N` | How many calls of one phase run at once (1 to 12, default 6). Raise it to 12 to run a 12-person jury in one go, but it is more likely to hit your plan's rate limit, and a juror that fails twice is recorded as "no vote". |

If `claude` is not on your PATH, set the `COURT_CLAUDE` environment variable to its path.

After a page-filed trial, `calls` in `.court/<date-time>/runner.json` holds, for each call, the time taken, the
time to the first words, the token counts and the model used. Use it to see which phase is slow.

### What you can do on the courtroom page

| Feature | Where | What it does |
| --- | --- | --- |
| Scene timeline | Bar under the stage, phase steps in the header | Jump straight to a scene. Earlier scenes appear at once and the chosen one plays. |
| Click a character | Characters on the stage | Jump to that person's latest words and make them the one you will question. Works from the keyboard too (Tab, then Enter). |
| Suggested questions | Chips above the ask box | One tap fills in who and what, and sends it. Questions about the verdict appear only after the judgment. |
| Past trials | "Past trials" in the header | Lists the trials in `.court/`, newest first, and opens the one you pick (`?run=NAME`). You can question older trials too. |
| Compare trials | Tick two in "Past trials" | Puts two verdicts side by side and marks the jurors who changed their vote. |
| Retrial | "Retrial" in the header, the clerk's closing scene | Fills the new-case dialog with the original case, the conditions for acquittal, a blank "what I did and what came of it", and the same jury size and seed. |
| Cost and time | Folding panel above the footer | Total time, calls, tokens and a per-call table for page-filed trials. While a trial runs it also shows "about N seconds to the verdict". |
| Vote map | Verdict card | Groups the jurors as money / customers & market / execution / risk & rules and shows who stood where. |
| Verdict image | "Verdict image" in the header | Downloads a PNG with the case, the verdict stamp, the vote map and the conditions for acquittal (no external library). |
| Print | "Print" in the header | Prints the record and the judgment as a document, without the stage. |
| Theme | ◐ in the header | System / light / dark. The choice is remembered in this browser. |
| Sound effects | 🔇 in the controls | Gavel, stamp and vote-sign sounds. Off by default (synthesised with Web Audio, no sound files). |
| English | EN / 한 in the header | Switches the page text to English. The case, statements and judgment stay as written. |
| Shortcuts | `?` | Space play/pause, → next, Home from the start. On a phone, swipe left for the next scene. |

## Cost and safety

- A trial is 8 `claude` calls (3 jurors) to 17 (12 jurors). Each question is one call. All of it counts toward
  your Claude plan's usage.
- The server listens on this computer only (`127.0.0.1`). It refuses requests for any other host and requests
  without the page's token.
- The `claude -p` calls made from the page run with every tool turned off (`--tools ""`) and see only the trial
  record. They do not read files or run commands.
- Files are written only inside `.court/` in the folder you run it from. `.court/` is in `.gitignore`, so trial
  records do not end up in the repository.

## Page code layout

The courtroom page is plain files with no build tool. Neither contributors nor users need Node.js.

```text
skills/court/web/
  index.html            page skeleton
  styles/               tokens · base · layout · header · tools · stage · characters · bubble
                        controls · dialog · ask · transcript · motion · responsive · print
  js/
    main.js             entry point: reads the data, builds the page, wires features together
    types.js            JSDoc types (not used at run time)
    core/               state · constants · dom · clock · markdown · prefs (browser settings) · i18n (Korean/English text)
    header/             title, phase steps, LIVE status
    stage/              sprite (pixel characters) · cast (seats and walking) · bubble (speech bubble) · effects (signs, gavel, stamp) · layout · pick (click a character)
    player/             scenes (record → scenes) · player (playback) · controls (buttons, keys) · timeline (scene bar)
    transcript/         messages (transcript messages) · intro (first card)
    live/               api · poll (live updates) · status · draft (drafts while writing) · questions · chips (suggested questions)
                        newCase · trials (past trials) · compare · retrial · cost (cost and time)
    ui/                 theme · help · print · sound · swipe · share (verdict image) · lang (EN / 한)
```

When `court.py` serves the page it inlines `styles/` as `<style>` and joins the modules in `js/` in dependency
order into one script. The saved `trial.html` is built the same way, so it opens as a single file. When you
change a module, keep to these rules:

- Import names explicitly (`import { a, b } from "./x.js";`) and export with `export function / const / let / class`.
- Joined, every module shares one scope, so a top-level name must not be reused in another module. A test checks this.
- Page text goes into `core/i18n.js` in both Korean and English and is used through `t("key")` or `data-i18n="key"`.
  A test checks that every key used exists.

Edit the files with `court.py serve` running and reload to see the change. In VS Code, `web/jsconfig.json` turns on
JSDoc type checking.

## What was tested

- Tested on Windows 11 (Korean) with Python 3.13. Not tested on macOS or Linux yet.
- A page-filed trial (3 jurors) was run to the end with the real `claude`. Question answers were checked only
  with a fake `claude`.
- The short system prompt, the `haiku`/`sonnet` model choice and streaming were each checked with real `claude`
  calls. The full page-filed flow with drafts and a separate jury model was checked with a fake `claude`.
- It was also measured that `claude -p` calls do not share a prompt cache even when their prompts start the same,
  so putting the shared record first was left out.
- Each page extra was checked in a browser. The retrial and the time-left estimate were checked by running a trial
  to the end on a fake `claude` server; the question chips and the verdict image were checked by intercepting the
  request and the download inside the page. Sound was checked only to play without errors.
- Unit tests:

```bash
python3 -m unittest discover -s tests
```

## Good to know

- This is not legal, financial or professional advice. The jurors are language models, not people, so read the
  verdict as a structured second opinion.
- Not made by Anthropic. The pixel characters on the courtroom page are this repository's own fan design and are
  not affiliated with Anthropic.

## Credit

As the original author asks, when you show this in a video or a post, credit it like this:

```text
/court skill by Alex Chen (@nocodealex): github.com/alexyc9381/court-skill
```

Every verdict ends with the same credit.

## Uninstall

```bash
rm -rf ~/.claude/skills/court
```
