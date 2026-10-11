---
name: court
description: >-
  Put an idea on trial in front of a jury of 12 Claudes. A prosecutor Claude
  argues it fails, a defense Claude argues it works, they rebut each other,
  12 juror Claudes with different backgrounds vote on their own, and a judge
  Claude reads the verdict and the conditions that would flip it. Use when the
  user wants honest pushback instead of agreement, says Claude just agrees with
  everything, asks "is this a good idea", wants an idea, plan, pitch or claim
  stress-tested, or says "court" or "put it on trial".
argument-hint: "[--jury N | --quick] [--seed S] <the idea, plan or claim>"
license: MIT
metadata:
  author: "Alex Chen (@nocodealex)"
  homepage: "https://chen.media"
  source: "https://github.com/alexyc9381/court-skill"
  version: "1.0.0"
---

# court

For when Claude agrees with everything you say. Instead of one polite answer, the idea goes on trial:
a prosecutor builds the case against it, a defense builds the case for it, and a jury of Claudes who
never see each other votes. You are the clerk of the court. You never argue, never vote, and never
soften the verdict.

What the user typed after `/court`: `$ARGUMENTS`

If that is blank, or still reads like a placeholder, take the case from the conversation: the idea,
plan or claim the user most recently wanted an opinion on.

## The tool

Every piece of bookkeeping goes through `court.py` in this skill's folder:

```bash
python3 "${CLAUDE_SKILL_DIR}/court.py" <command>
```

Below, `COURT` means exactly that command. If the path looks unexpanded, use the "Base directory for
this skill" that Claude Code printed at the top of this skill. The state lives in
`.court/<run>/state.json` in the current directory, and every command after `init` finds it through
`.court/LATEST`.

## Step 1: size it

Read the flags out of the request. Everything that is not a flag is the case.

| flag | meaning |
| --- | --- |
| `--jury N` | N jurors, 3 to 12. Default 12. |
| `--quick` | 6 jurors. |
| `--seed S` | Fixes which jurors sit on a smaller jury. Default: random, and recorded. |

Run `COURT plan` with the same flags and tell the user in one line how big the trial is, for example
"12 jurors, 17 sub-agent calls", then start. If this skill fired on its own (the user never asked for
a trial), ask once first and offer `--quick`.

Sub-agents write into `.court/` in the current directory. In the default permission mode that is one
approval per file. Suggest accept-edits mode (Shift+Tab) for the trial. Do not change the user's
settings yourself.

## Step 2: write the case file

**Sub-agents cannot see this conversation.** The prosecutor, the defense, every juror and the judge
know only what is in the case file, so write `.court/case.md` to stand on its own:

- First line: the case in one sentence, in the user's own words where you can ("Quit my job to sell
  candles on Etsy full time").
- Then everything the user told you that matters: numbers, audience, budget, timeline, what they have
  already tried, constraints.
- Do not add facts the user never gave, and do not write your own opinion of the idea into it. A case
  file that leans one way decides the trial before it starts.

## Step 3: open the trial

```bash
COURT init --case-file .court/case.md [--jury N | --quick] [--seed S]
```

Then open the live courtroom. Start `COURT serve` as a **background** command (in Claude Code, Bash
with `run_in_background`) so it keeps running while you drive the trial, and do not wait on it. It
prints `court: courtroom is live at http://127.0.0.1:<port>/`; give the user that link in one line.
The page follows the trial as each statement, vote and judgment lands on disk, and the user can ask
the judge, either side, the clerk or any juror a question from the page. Each question is one
tool-less `claude -p` call that sees only the trial record, so it uses the user's plan. If the server
says the claude CLI is not logged in, tell the user that questions need `claude auth login` once.
If a server from an earlier trial is still running, it already follows `.court/LATEST`: reuse its
link instead of starting another. If it fails to start, carry on with the trial without it.

The page also has a "+ 새 사건" button: the user can file a new case there without coming back to
this conversation. Those trials are run by the server itself with `claude -p` in place of your
sub-agents (same phases, briefs and retry rules, one trial at a time), so you have nothing to drive
for them. From a terminal, `COURT run` does the same for the latest trial opened with `init`.

## Step 4: the trial

Always drive it with `COURT next`. It reads the files on disk and tells you the next phase and the
exact command. The phases run in this order: `opening`, `rebuttal`, `jury`, `judge`.

Every phase works the same way:

1. `COURT prompts <phase>` writes one brief per job and lists the jobs still to run, in waves.
2. Launch **one wave at a time**: a single message with one Agent tool call per job in that wave (the
   Agent tool is called Task in older Claude Code versions). Each call is:
   - `subagent_type`: `general-purpose`
   - `description`: `court <job id>`
   - `prompt`: `Read <brief path> and follow it exactly. It is your whole brief.`

   Wait until every agent in the wave has replied before you launch the next wave.
3. After the last wave, run `COURT next`. If an output is missing it sends you back to the same phase,
   and `prompts` then lists only the missing jobs. Re-run those once. If a juror fails twice, write
   the single line `NO VOTE` into its file (`COURT check jury` lists it) and move on. Never write a
   vote, a statement or a judgment yourself.

## Step 5: the verdict

When `COURT next` says the trial is over:

```bash
COURT render
```

It counts the votes, writes `VERDICT.md` into the run folder and prints it. Show the user the verdict
line, the vote table and the judge's sections exactly as written. Then add at most two lines of your
own: the single condition for acquittal you would start with, and the path to the full trial.

`render` also writes `trial.html` next to `VERDICT.md` and prints its path on the last line: the
whole trial replayed as a courtroom (prosecution and defense trading statements, jurors' cards
flipping one by one, the gavel and the verdict). It is built from the files on disk, so it costs no
extra sub-agent calls. Give the user its path as a link they can open in a browser. This saved copy
is a replay only; questions work on the live page from `COURT serve`, which keeps running after the
verdict so the user can keep asking.

Rules for you, the clerk:

- Never change, soften or re-count the verdict. A guilty verdict is useful information, not bad news
  to cushion.
- Never add praise the jury did not give.
- If the user disagrees with the verdict, offer a retrial with the changes from "Conditions for
  acquittal" written into a new case file. Do not argue for either side yourself.
