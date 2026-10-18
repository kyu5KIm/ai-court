#!/usr/bin/env python3
"""Bookkeeping for the court skill: put an idea on trial in front of a jury of Claudes.

The skill's orchestrator (Claude) drives the trial with these commands. Every sub-agent reads a
brief this script writes and writes one output file; this script checks the files, counts the votes
and renders the verdict. All state lives in .court/<run>/ in the current directory.

    python3 court.py plan [--jury N | --quick]
    python3 court.py init --case-file PATH [--jury N | --quick] [--seed S]
    python3 court.py next
    python3 court.py prompts <phase>
    python3 court.py check <phase>
    python3 court.py tally
    python3 court.py render
    python3 court.py run [--model M]
    python3 court.py serve [--port P] [--run DIR] [--model M]

Phases, in order: opening, rebuttal, jury, judge.
"""
import argparse
import json
import os
import random
import re
import subprocess
import sys
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "web")
ROOT = ".court"
LATEST = os.path.join(ROOT, "LATEST")
PHASES = ["opening", "rebuttal", "jury", "judge"]
DEFAULT_JURY = 12
QUICK_JURY = 6
WAVE = 6
CREDIT = ("_Made with [/court](https://github.com/alexyc9381/court-skill), a free Claude Code skill by Alex Chen ([@nocodealex](https://instagram.com/nocodealex))._")
CHARGE = "The case fails as stated: it should not go ahead the way it is described."


# ---------- state ----------

def read_text(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def load_jurors():
    with open(os.path.join(HERE, "jurors.json"), encoding="utf-8") as f:
        return json.load(f)


def run_dir():
    if not os.path.exists(LATEST):
        sys.exit("court: no trial yet. Run: court.py init --case-file .court/case.md")
    with open(LATEST, encoding="utf-8") as f:
        return f.read().strip()


def load_state(rd=None):
    rd = rd or run_dir()
    with open(os.path.join(rd, "state.json"), encoding="utf-8") as f:
        return json.load(f)


def save_state(state):
    with open(os.path.join(state["dir"], "state.json"), "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def jury_size(args):
    if getattr(args, "quick", False):
        return QUICK_JURY
    n = getattr(args, "jury", None) or DEFAULT_JURY
    if n < 3 or n > 12:
        sys.exit("court: the jury must be 3 to 12 Claudes")
    return n


# ---------- jobs ----------

def jobs(state, phase):
    """Each job: id, brief path, output path."""
    d = state["dir"]
    if phase in ("opening", "rebuttal"):
        ids = ["prosecution", "defense"]
    elif phase == "jury":
        ids = ["juror-%02d" % (i + 1) for i in range(len(state["jury"]))]
    elif phase == "judge":
        ids = ["judge"]
    else:
        sys.exit("court: unknown phase %r (phases: %s)" % (phase, ", ".join(PHASES)))
    out = []
    for jid in ids:
        out.append({
            "id": jid,
            "brief": os.path.abspath(os.path.join(d, "briefs", "%s-%s.md" % (phase, jid))),
            "output": os.path.abspath(os.path.join(d, phase, "%s.md" % jid)),
        })
    return out


def done(job):
    p = job["output"]
    return os.path.exists(p) and os.path.getsize(p) > 0


def missing(state, phase):
    return [j for j in jobs(state, phase) if not done(j)]


# ---------- briefs ----------

def _abs(state, *parts):
    return os.path.abspath(os.path.join(state["dir"], *parts))


def brief_text(state, phase, job):
    case = _abs(state, "case.md")
    head = ("You are one part of a trial run by the court skill. You cannot see the user's conversation: "
            "everything you know is in the files named below. Use only what is in the record. Never invent "
            "facts, numbers, quotes or sources. Where the record is silent, say what is missing and why it "
            "matters. Write in the language the case file is written in. "
            "Write your answer to exactly this file and nothing else:\n\n    %s\n\n"
            "The charge: %s\n\nThe case file: %s\n\n" % (job["output"], CHARGE, case))
    if phase == "opening":
        if job["id"] == "prosecution":
            return head + (
                "You are the PROSECUTOR. Build the strongest honest case that the charge holds.\n\n"
                "- 3 to 5 numbered charges. Each names one concrete way the case fails, the evidence for it from "
                "the case file (quote it), and what it would cost if you are right.\n"
                "- Attack the case as the user actually wrote it, never a weaker version of it.\n"
                "- No insults, no hedging, no praise. 350 words at most.\n")
        return head + (
            "You are the DEFENSE. Build the strongest honest case that the charge does NOT hold: the case "
            "should go ahead as described.\n\n"
            "- 3 to 5 numbered points. Each names one concrete strength, the evidence for it from the case "
            "file (quote it), and why it outweighs the obvious objection.\n"
            "- Defend the case as the user actually wrote it. If a part cannot be defended, concede it in one "
            "line instead of spinning it.\n- 350 words at most.\n")
    if phase == "rebuttal":
        side, other = ("prosecution", "defense") if job["id"] == "prosecution" else ("defense", "prosecution")
        return head + (
            "You are the %s. Read the other side's opening statement:\n\n    %s\n\n"
            "Answer each of its numbered points in order: say whether it survives, and why, in one or two "
            "sentences each. Then name the one point the jury should decide on. 250 words at most.\n"
            % (side.upper(), _abs(state, "opening", other + ".md")))
    if phase == "jury":
        idx = int(job["id"].split("-")[1]) - 1
        juror = state["jury"][idx]
        record = "\n".join("    " + _abs(state, p, s + ".md")
                           for p in ("opening", "rebuttal") for s in ("prosecution", "defense"))
        return head + (
            "You are JUROR %d of %d: %s. %s\n\n"
            "Read the case file and all four statements:\n\n%s\n\n"
            "Decide on your own: you will never see the other jurors. You owe the case nothing. Voting for it "
            "to be kind, or against it to look tough, is contempt of court. Judge it through your own eyes "
            "as described above.\n\n"
            "Write exactly these four lines and nothing else:\n\n"
            "VOTE: GUILTY or NOT GUILTY\n"
            "REASON: one sentence, in your own voice\n"
            "DECIDING FACT: the one fact from the record that decided it\n"
            "WOULD FLIP IF: the one change to the case that would make you vote the other way\n"
            % (idx + 1, len(state["jury"]), juror["name"], juror["lens"], record))
    if phase == "judge":
        return head + (
            "You are the JUDGE. The jury has voted and you cannot overturn the vote. Read the case file, the "
            "four statements in %s and %s, every juror's vote in %s, and the count in %s.\n\n"
            "Write these sections, plainly, for someone who has never seen a courtroom:\n\n"
            "## Charges that stuck\nThe 3 objections the jurors cited most, each in one sentence, with how "
            "many jurors leaned on it.\n\n"
            "## What the defense got right\nThe 2 strongest points in the case's favour.\n\n"
            "## Conditions for acquittal\nThe 3 specific changes that would flip the most votes, built from "
            "the jurors' WOULD FLIP IF lines. Each one is something the user can do this week.\n\n"
            "## The sentence\nOne short paragraph in a judge's voice: what the user should do next.\n\n"
            "250 words at most. Do not repeat the vote count: it is printed above your judgment.\n"
            % (_abs(state, "opening"), _abs(state, "rebuttal"), _abs(state, "jury"),
               _abs(state, "tally.json")))
    raise ValueError(phase)


# ---------- votes ----------

VOTE_RE = re.compile(r"^\s*\**VOTE\**\s*:\s*\**\s*(NOT\s+GUILTY|GUILTY)", re.I | re.M)
FIELD_RE = r"^\s*\**%s\**\s*:\s*(.+)$"


def parse_vote(text):
    m = VOTE_RE.search(text or "")
    if not m:
        return None
    vote = "NOT GUILTY" if "NOT" in m.group(1).upper() else "GUILTY"
    out = {"vote": vote}
    for key, name in (("reason", "REASON"), ("fact", "DECIDING FACT"), ("flip", "WOULD FLIP IF")):
        f = re.search(FIELD_RE % name, text, re.I | re.M)
        out[key] = f.group(1).strip().strip("*").strip() if f else ""
    return out


def tally(state):
    result = count_votes(state)
    with open(os.path.join(state["dir"], "tally.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return result


def count_votes(state):
    rows = []
    for j, juror in zip(jobs(state, "jury"), state["jury"]):
        text = read_text(j["output"]) if done(j) else ""
        v = parse_vote(text)
        rows.append({"juror": juror["name"], "vote": v["vote"] if v else "NO VOTE",
                     "reason": v["reason"] if v else "", "fact": v["fact"] if v else "",
                     "flip": v["flip"] if v else ""})
    guilty = sum(1 for r in rows if r["vote"] == "GUILTY")
    not_guilty = sum(1 for r in rows if r["vote"] == "NOT GUILTY")
    if guilty > not_guilty:
        verdict = "GUILTY"
    elif not_guilty > guilty:
        verdict = "NOT GUILTY"
    else:
        verdict = "HUNG JURY"
    return {"verdict": verdict, "guilty": guilty, "not_guilty": not_guilty,
            "no_vote": len(rows) - guilty - not_guilty, "jurors": rows}


def verdict_line(t):
    if t["verdict"] == "HUNG JURY":
        return "HUNG JURY, %d to %d" % (t["guilty"], t["not_guilty"])
    big, small = (t["guilty"], t["not_guilty"]) if t["verdict"] == "GUILTY" else (t["not_guilty"], t["guilty"])
    return "%s, %d to %d" % (t["verdict"], big, small)


def render(state):
    t = tally(state)
    case = read_text(os.path.join(state["dir"], "case.md")).strip()
    first = case.splitlines()[0].lstrip("# ").strip() if case else "(empty case)"
    judge = jobs(state, "judge")[0]
    ruling = read_text(judge["output"]).strip() if done(judge) else ""
    judgment = ruling or "_The judge has not ruled yet._"
    write_trial(state)
    lines =["# The verdict: %s" % verdict_line(t), "",
             "**The case:** %s" % first, "", "**The charge:** %s" % CHARGE, "",
             "## How the jury voted", "", "| Juror | Vote | Why |", "|---|---|---|"]
    for r in t["jurors"]:
        lines.append("| %s | %s | %s |" % (r["juror"], r["vote"], r["reason"].replace("|", "/")))
    lines += ["", judgment, "",
              "_The full trial is in %s: the opening statements, the rebuttals and every juror's vote._"
              % os.path.abspath(state["dir"]), "", CREDIT]
    text = "\n".join(lines) + "\n"
    with open(os.path.join(state["dir"], "VERDICT.md"), "w", encoding="utf-8") as f:
        f.write(text)
    return text


def next_phase(state):
    for phase in PHASES:
        if missing(state, phase):
            return phase
    return "done"


def trial_data(state):
    """Everything on disk so far, for the courtroom page. Safe to call mid-trial."""
    def read(*parts):
        p = os.path.join(state["dir"], *parts)
        return read_text(p).strip() if os.path.exists(p) else ""

    t = count_votes(state)
    voted = [done(j) for j in jobs(state, "jury")]
    phase = next_phase(state)
    return {
        "verdict": t["verdict"], "guilty": t["guilty"], "not_guilty": t["not_guilty"],
        "no_vote": t["no_vote"], "case": read("case.md"), "charge": CHARGE, "judge": read("judge", "judge.md"),
        "statements": [{"phase": ph, "side": side, "text": read(ph, side + ".md")}
                       for ph in ("opening", "rebuttal") for side in ("prosecution", "defense")],
        "jurors": [dict(row, lens=j["lens"], voted=v) for row, j, v in zip(t["jurors"], state["jury"], voted)],
        "phase": phase, "finished": phase == "done", "questions": load_questions(state),
        "runner": read_json(os.path.join(state["dir"], "runner.json")), "drafts": read_drafts(state),
        "dir": os.path.abspath(state["dir"]), "seed": state.get("seed"), "live": False,
    }


def read_drafts(state):
    """Replies still being written, by "<phase>/<job id>"."""
    out = {}
    for phase in PHASES:
        for job in jobs(state, phase):
            path = draft_path(job)
            if os.path.exists(path) and not done(job):
                try:
                    out["%s/%s" % (phase, job["id"])] = read_text(path)
                except OSError:
                    pass
    return out


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_text(path, text, tries=20):
    """Replace a file in one step, so a reader never sees half of it.

    On Windows the swap fails while another thread has the file open (the page server reads these
    files every second or two), so it retries for about a second before giving up.
    """
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        f.write(text)
    for i in range(tries):
        try:
            os.replace(path + ".tmp", path)
            return
        except PermissionError:
            if i == tries - 1:
                raise
            time.sleep(0.05)


def write_json(path, obj):
    write_text(path, json.dumps(obj, ensure_ascii=False, indent=2))


def draft_path(job):
    """Where a call's reply-so-far is kept while it streams."""
    return job["output"] + ".draft"


def write_draft(path, text):
    """Best effort: if a reader holds the draft, skip; the next update lands."""
    try:
        write_text(path, text, tries=1)
    except OSError:
        pass


def drop_draft(path):
    try:
        os.remove(path)
    except OSError:
        pass


def throttled(fn, every=0.4):
    """fn, called at most once per `every` seconds; the calls in between are dropped."""
    last = [0.0]

    def call(*a):
        now = time.time()
        if now - last[0] >= every:
            last[0] = now
            fn(*a)
    return call


# The courtroom page lives in web/ as plain files: index.html, styles/*.css and ES modules under js/.
# There is no build step. page_html() inlines the stylesheets and joins the module graph into one
# classic script, so the live server and the saved trial.html are both a single self-contained page.
LINK_RE = re.compile(r'<link rel="stylesheet" href="([^"]+)">')
MODULE_RE = re.compile(r'<script type="module" src="([^"]+)"></script>')
IMPORT_RE = re.compile(r'^import \{[^}]*\} from "(\.{1,2}/[^"]+)";[ \t]*\n', re.M)
EXPORT_RE = re.compile(r"^export (?=(?:async )?function |const |let |class )", re.M)


def bundle_js(entry):
    """Join an ES module graph into one script, dependencies first.

    Modules must use named imports (`import { a, b } from "./x.js";`) and `export function/const/let/class`.
    Every top-level name shares one scope after joining, so names must be unique across modules.
    """
    order, seen = [], set()

    def visit(path):
        path = os.path.normpath(path)
        if path in seen:
            return
        seen.add(path)
        for rel in IMPORT_RE.findall(read_text(path)):
            visit(os.path.join(os.path.dirname(path), rel))
        order.append(path)

    visit(entry)
    parts = []
    for path in order:
        src = EXPORT_RE.sub("", IMPORT_RE.sub("", read_text(path)))
        if re.search(r"^\s*(import|export)\b", src, re.M):
            raise ValueError("court: %s uses an import/export the page bundler cannot join" % path)
        parts.append("// %s\n%s" % (os.path.relpath(path, WEB).replace(os.sep, "/"), src.strip()))
    return '(function () {\n"use strict";\n' + "\n\n".join(parts) + "\n})();"


def page_html(data):
    # "<" never appears raw inside the data block, so no statement can close it early or look like a tag.
    blob = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    html = read_text(os.path.join(WEB, "index.html")).replace("__COURT_DATA__", blob, 1)
    html = LINK_RE.sub(lambda m: "<style>\n%s\n</style>" % read_text(os.path.join(WEB, m.group(1))).strip(), html)
    return MODULE_RE.sub(lambda m: "<script>\n%s\n</script>" % bundle_js(os.path.join(WEB, m.group(1))), html)


def write_trial(state):
    """Write trial.html next to VERDICT.md: the whole trial replayed as a courtroom."""
    if not os.path.exists(os.path.join(WEB, "index.html")):
        return None
    out = os.path.join(state["dir"], "trial.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(page_html(trial_data(state)))
    return os.path.abspath(out)


# ---------- questions from the courtroom page ----------

QLOCK = threading.Lock()
ROLE_KO = {"judge": "판사", "prosecution": "검사", "defense": "변호인", "clerk": "서기"}
ROLE_BRIEF = {
    "judge": "너는 이 재판의 판사야. 배심원의 표는 뒤집을 수 없어. 판결의 이유, 인정된 혐의, 무죄 조건을 설명해.",
    "prosecution": "너는 이 재판의 검사야. 이 안건이 적힌 그대로는 실패한다는 쪽을 맡았지만, 정직하게 답해.",
    "defense": "너는 이 재판의 변호인이야. 이 안건이 진행돼야 한다는 쪽을 맡았어. 지킬 수 없는 점은 솔직히 인정해.",
    "clerk": "너는 이 재판의 서기야. 어느 편도 들지 않고, 기록을 요약하고 재판 절차를 설명해.",
}


def questions_dir(state):
    return os.path.join(state["dir"], "questions")


def load_questions(state):
    qd = questions_dir(state)
    out = []
    if os.path.isdir(qd):
        for name in sorted(os.listdir(qd)):
            if name.endswith(".json"):
                try:
                    with open(os.path.join(qd, name), encoding="utf-8") as f:
                        out.append(json.load(f))
                except (OSError, ValueError):
                    pass
    return out


def save_question(state, rec):
    qd = questions_dir(state)
    os.makedirs(qd, exist_ok=True)
    write_json(os.path.join(qd, rec["id"] + ".json"), rec)


def new_question(state, who, text):
    with QLOCK:
        rec = {"id": "q-%03d" % (len(load_questions(state)) + 1), "who": who, "q": text,
               "status": "pending", "answer": "", "asked": time.strftime("%Y-%m-%dT%H:%M:%S")}
        save_question(state, rec)
    return rec


def roles(state):
    return list(ROLE_KO) + ["juror-%d" % i for i in range(len(state["jury"]))]


def ask_prompt(state, rec):
    data = trial_data(state)
    who = rec["who"]
    if who.startswith("juror-"):
        i = int(who.split("-")[1])
        j = data["jurors"][i]
        role = "너는 이 재판의 배심원 %d번, %s야. %s" % (i + 1, j["juror"], j["lens"])
        if j["voted"]:
            role += " 너는 %s에 투표했어. 이유: %s / 결정적 사실: %s / 뒤집힐 조건: %s" % (
                j["vote"], j["reason"], j["fact"], j["flip"])
        else:
            role += " 아직 투표하지 않았어."
    else:
        role = ROLE_BRIEF[who]
    parts = [role, "",
             "아래는 이 재판의 기록 전부야. 기록에 있는 것만 근거로 삼아. 기록에 없는 사실, 숫자, 출처는 지어내지 말고, "
             "모르면 기록에 없다고 말해. 평결이 이미 나왔다면 바꾸거나 부드럽게 만들지 마.",
             "법정의 방청객(이 안건을 낸 사람)이 너에게 질문했어. 한국어로, 네 역할의 입장에서, 5문장 이내로 답해. "
             "제목이나 표는 쓰지 마.", "",
             "=== 기소 내용 ===", CHARGE, "", "=== 사건 기록 ===", data["case"] or "(없음)"]
    names = {"opening": "모두진술", "rebuttal": "반박", "prosecution": "검사", "defense": "변호인"}
    for s in data["statements"]:
        if s["text"]:
            parts += ["", "=== %s %s ===" % (names[s["side"]], names[s["phase"]]), s["text"]]
    votes = ["- %s: %s. 이유: %s / 뒤집힐 조건: %s" % (j["juror"], j["vote"], j["reason"], j["flip"])
             for j in data["jurors"] if j["voted"]]
    if votes:
        parts += ["", "=== 배심원 표 ===", "\n".join(votes)]
        if all(j["voted"] for j in data["jurors"]):
            parts += ["평결: %s (유죄 %d, 무죄 %d)" % (data["verdict"], data["guilty"], data["not_guilty"])]
    if data["judge"]:
        parts += ["", "=== 판사의 판결 ===", data["judge"]]
    past = [q for q in data["questions"] if q["status"] == "done" and q["id"] != rec["id"]][-4:]
    if past:
        parts += ["", "=== 앞서 나온 질문과 답 ==="]
        for q in past:
            parts += ["Q (%s에게): %s" % (q["who"], q["q"]), "A: %s" % q["answer"]]
    parts += ["", "=== 질문 ===", rec["q"]]
    return "\n".join(parts)


NOT_LOGGED_IN = ("이 컴퓨터의 claude 명령이 로그인되어 있지 않아요. 터미널에서 `claude auth login`을 한 번 실행한 뒤 "
                 "다시 시도해 주세요.")


def child_env():
    """The environment for `claude -p`, minus what a parent Claude Code session injects.

    When this server is started from inside a Claude Code session, variables such as CLAUDECODE or the
    session's own API proxy would leak into the child; it should run as the user's plain CLI instead.
    """
    env = dict(os.environ)
    inherited = "CLAUDE_CODE_ENTRYPOINT" in env
    for k in list(env):
        if k == "CLAUDECODE" or k.startswith(("CLAUDE_CODE_", "CLAUDE_AGENT_SDK_", "CLAUDE_PREVIEW_")) or \
                k in ("CLAUDE_PID", "CLAUDE_EFFORT"):
            env.pop(k)
    if inherited:
        env.pop("ANTHROPIC_BASE_URL", None)
    return env


def claude_logged_in(claude):
    try:
        r = subprocess.run([claude, "auth", "status"], capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=30, env=child_env())
        return json.loads(r.stdout).get("loggedIn") is not False
    except (OSError, ValueError, subprocess.SubprocessError):
        return True  # can't tell; let the first question find out


# A short system prompt in place of Claude Code's default one (about 9,000 tokens of coding-agent
# instructions these roles never use). The role itself is in the user message.
TRIAL_SYSTEM = ("You play one part in a structured trial of an idea. You have no tools: everything you know "
                "is in the user's message. Follow the brief in it exactly and reply only with the text it asks for.")
QUESTION_SYSTEM = ("You answer one question as a participant in a trial, using only the trial record in the "
                   "user's message. Stay in your role and follow the message's instructions on language and length.")


def claude_call(claude, model, prompt, cwd, timeout=600, on_text=None, system=None):
    """One tool-less `claude -p` call, streamed. `system` replaces the default system prompt.

    `on_text(reply_so_far)` runs as the reply grows. Returns the reply and what the call cost:
    {"text", "seconds", "first_text" (seconds until the first words), "input", "cache_read",
    "cache_write", "output"} (token counts).
    """
    cmd = [claude, "-p", "--tools", "", "--strict-mcp-config", "--no-session-persistence",
           "--output-format", "stream-json", "--verbose", "--include-partial-messages"]
    if model:
        cmd += ["--model", model]
    if system:
        cmd += ["--system-prompt", system]
    t0 = time.time()
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                         encoding="utf-8", errors="replace", env=child_env(), cwd=cwd)
    timer = threading.Timer(timeout, p.kill)
    timer.start()
    stderr = []
    drain = threading.Thread(target=lambda: stderr.append(p.stderr.read()), daemon=True)
    drain.start()
    parts, result, first = [], None, None
    try:
        p.stdin.write(prompt)
        p.stdin.close()
        for line in p.stdout:
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            if ev.get("type") == "result":
                result = ev
            elif ev.get("type") == "stream_event":
                delta = ev.get("event", {}).get("delta", {})
                if delta.get("type") == "text_delta" and delta.get("text"):
                    if first is None:
                        first = time.time() - t0
                    parts.append(delta["text"])
                    if on_text:
                        on_text("".join(parts))
        p.wait()
    except BaseException:
        p.kill()
        raise
    finally:
        timed_out = not timer.is_alive() and p.returncode not in (0, None)
        timer.cancel()
    drain.join(1)
    result = result or {}
    text = (result.get("result") if isinstance(result.get("result"), str) else "".join(parts)).strip()
    if p.returncode != 0 or result.get("is_error") or not text:
        err = "timed out after %ds" % timeout if timed_out else \
            ("".join(stderr) or text or "exit code %s" % p.returncode).strip()
        if "not logged in" in err.lower() or "/login" in err:
            err = NOT_LOGGED_IN
        raise RuntimeError(err[:300])
    usage = result.get("usage") or {}
    return {"text": text, "seconds": round(time.time() - t0, 1),
            "first_text": round(first, 1) if first is not None else None,
            "input": usage.get("input_tokens", 0), "cache_read": usage.get("cache_read_input_tokens", 0),
            "cache_write": usage.get("cache_creation_input_tokens", 0), "output": usage.get("output_tokens", 0)}


def cost_line(c):
    """A one-line summary of a claude_call() result, for logs."""
    first = " (first words %.1fs)" % c["first_text"] if c.get("first_text") is not None else ""
    return "%.1fs%s, %d tokens in (%d cached), %d out" % (
        c["seconds"], first, c["input"] + c["cache_read"] + c["cache_write"], c["cache_read"], c["output"])


def answer_question(state, rec, claude, model, slots):
    """Answer one question with a tool-less `claude -p` call that sees only the trial record."""
    with slots:
        try:
            def partial(text):
                rec["answer"] = text
                try:
                    save_question(state, rec)
                except OSError:
                    pass
            c = claude_call(claude, model, ask_prompt(state, rec), state["dir"], 300, system=QUESTION_SYSTEM,
                            on_text=throttled(partial))
            rec.update(status="done", answer=c["text"], cost={k: v for k, v in c.items() if k != "text"})
        except Exception as e:
            rec.update(status="error", answer="답변을 받지 못했어요: %s" % e)
        rec["answered"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        save_question(state, rec)


# ---------- trials run without a Claude Code session (from the page, or `court.py run`) ----------

def open_trial(case, n, seed=None):
    """Create a new run folder for `case` and point .court/LATEST at it. Returns the state."""
    seed = seed if seed is not None else random.randrange(1, 10 ** 6)
    jurors = load_jurors()
    jury = jurors[:] if n == len(jurors) else random.Random(seed).sample(jurors, n)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    rd, k = os.path.join(ROOT, stamp), 1
    while os.path.exists(rd):
        k += 1
        rd = os.path.join(ROOT, "%s-%d" % (stamp, k))
    for sub in ("briefs", "opening", "rebuttal", "jury", "judge"):
        os.makedirs(os.path.join(rd, sub), exist_ok=True)
    with open(os.path.join(rd, "case.md"), "w", encoding="utf-8") as f:
        f.write(case.strip() + "\n")
    state = {"dir": rd, "seed": seed, "jury": jury, "created": time.strftime("%Y-%m-%dT%H:%M:%S")}
    save_state(state)
    with open(LATEST, "w", encoding="utf-8") as f:
        f.write(rd)
    return state


def record_files(state, phase, job):
    """The files a job's brief tells it to read, in the order the brief names them."""
    files = ["case.md"]
    statements = ["opening/prosecution.md", "opening/defense.md", "rebuttal/prosecution.md", "rebuttal/defense.md"]
    if phase == "rebuttal":
        files.append("opening/%s.md" % ("defense" if job["id"] == "prosecution" else "prosecution"))
    elif phase == "jury":
        files += statements
    elif phase == "judge":
        files += statements + ["jury/%s.md" % j["id"] for j in jobs(state, "jury")] + ["tally.json"]
    return [os.path.join(state["dir"], f) for f in files]


def headless_prompt(state, phase, job):
    text = brief_text(state, phase, job)
    text += ("\n---\nThis run has no tools. Every file the brief names is pasted below. Reply with exactly the "
             "text that belongs in your output file and nothing else: it is saved to that file for you.\n")
    for path in record_files(state, phase, job):
        body = read_text(path).strip() if os.path.exists(path) else "(missing)"
        text += "\n=== %s ===\n%s\n" % (os.path.abspath(path), body)
    return text


def set_runner(state, status, message="", phase=None, calls=None, seconds=None):
    """runner.json: how a page-filed trial is going, and what each claude call cost."""
    write_json(os.path.join(state["dir"], "runner.json"),
               {"status": status, "message": message, "phase": phase, "at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "seconds": seconds, "calls": calls or {}})


# Models the page may pick for the jury: the CLI's aliases, or "" for the same model as everyone else.
JURY_MODELS = ("", "haiku", "sonnet", "opus")


def run_trial(state, claude, model=None, log=print, jury_model=None, parallel=WAVE):
    """Drive a whole trial with `claude -p` calls in place of the clerk's sub-agents.

    Same phases, briefs and retry rules as SKILL.md: each phase's missing jobs run in parallel, missing
    ones are retried once, a juror that fails twice gets NO VOTE, anything else that fails twice stops
    the trial. `jury_model` runs the jurors on a different (usually faster) model than the other roles.
    `parallel` caps how many calls of one phase run at once (1 to 12); more is faster for a big jury but
    more likely to hit the plan's rate limit.
    """
    from concurrent.futures import ThreadPoolExecutor

    t0 = time.time()
    calls, lock = {}, threading.Lock()

    def run_job(phase, job):
        try:
            use = (jury_model or model) if phase == "jury" else model
            draft = draft_path(job)
            c = claude_call(claude, use, headless_prompt(state, phase, job), state["dir"], system=TRIAL_SYSTEM,
                            on_text=throttled(lambda text: write_draft(draft, text)))
            write_text(job["output"], c["text"] + "\n")
            drop_draft(draft)
            with lock:
                calls["%s/%s" % (phase, job["id"])] = dict({k: v for k, v in c.items() if k != "text"},
                                                          model=use or "default")
            log("court: %s %s done in %s" % (phase, job["id"], cost_line(c)))
        except Exception as e:
            drop_draft(draft_path(job))
            log("court: %s %s failed: %s" % (phase, job["id"], e))
            return str(e)
        return None

    try:
        for phase in PHASES:
            if phase == "judge":
                tally(state)
            errors = []
            for attempt in (1, 2):
                todo = missing(state, phase)
                if not todo:
                    break
                set_runner(state, "running", "", phase, calls, round(time.time() - t0, 1))
                for j in jobs(state, phase):
                    with open(j["brief"], "w", encoding="utf-8") as f:
                        f.write(brief_text(state, phase, j))
                with ThreadPoolExecutor(max_workers=max(1, min(parallel, DEFAULT_JURY))) as pool:
                    errors = [e for e in pool.map(lambda j: run_job(phase, j), todo) if e]
            todo = missing(state, phase)
            if todo and phase == "jury":
                for j in todo:
                    with open(j["output"], "w", encoding="utf-8") as f:
                        f.write("NO VOTE\n")
            elif todo:
                reason = errors[0] if errors else "빈 답"
                who = {"prosecution": "검사", "defense": "변호인", "judge": "판사"}[todo[0]["id"]]
                stage = {"opening": "모두진술", "rebuttal": "반박", "judge": "판결"}[phase]
                raise RuntimeError("%s 단계에서 %s의 답을 받지 못했어요: %s" % (stage, who, reason))
        render(state)
        seconds = round(time.time() - t0, 1)
        set_runner(state, "done", "", None, calls, seconds)
        log("court: the trial is over in %.0fs: %s" % (seconds, verdict_line(count_votes(state))))
    except Exception as e:
        set_runner(state, "error", str(e)[:300], None, calls, round(time.time() - t0, 1))
        log("court: the trial stopped: %s" % e)


def cmd_run(args):
    import shutil
    claude = os.environ.get("COURT_CLAUDE") or shutil.which("claude")
    if not claude:
        sys.exit("court: the claude CLI is not on PATH")
    state = load_state()
    print("court: running %s with claude -p" % state["dir"], flush=True)
    run_trial(state, claude, args.model, log=lambda m: print(m, flush=True), jury_model=args.jury_model,
              parallel=args.parallel)


RUN_NAME_RE = re.compile(r"^[\w-]{1,64}$")


def run_path(root, name):
    """The folder of trial `name` under root/.court, or None if that is not a trial there.

    Names come from the page, so only plain folder names are accepted (no separators, no "..").
    """
    if not name or not RUN_NAME_RE.match(name):
        return None
    rd = os.path.join(root, ROOT, name)
    return rd if os.path.isfile(os.path.join(rd, "state.json")) else None


def latest_run(root):
    """The folder name .court/LATEST points at, or an empty string."""
    try:
        return re.split(r"[\\/]", read_text(os.path.join(root, LATEST)).strip())[-1]
    except OSError:
        return ""


def list_trials(root):
    """Every trial under root/.court, newest first, with what the past-trials list shows."""
    base = os.path.join(root, ROOT)
    latest = latest_run(root)
    out = []
    for name in sorted(os.listdir(base), reverse=True) if os.path.isdir(base) else []:
        rd = run_path(root, name)
        if not rd:
            continue
        try:
            state = load_state(rd)
            state["dir"] = rd
            lines = [l.strip().lstrip("#").strip() for l in read_text(os.path.join(rd, "case.md")).splitlines()]
            t = count_votes(state)
            voted = all(done(j) for j in jobs(state, "jury"))
            out.append({"run": name, "case": next((l for l in lines if l), "")[:140],
                        "created": state.get("created"), "jury": len(state["jury"]), "seed": state.get("seed"),
                        "finished": next_phase(state) == "done", "verdict": t["verdict"] if voted else None,
                        "guilty": t["guilty"], "not_guilty": t["not_guilty"], "latest": name == latest})
        except (OSError, ValueError, KeyError):
            continue
    return out


def cmd_serve(args):
    import http.server
    import secrets
    import shutil
    from urllib.parse import urlsplit, parse_qs

    claude = os.environ.get("COURT_CLAUDE") or shutil.which("claude")
    token = secrets.token_urlsafe(18)
    root = os.getcwd()
    slots = threading.Semaphore(2)
    cfg = {"port": None, "login": False, "fixed": os.path.abspath(args.run) if args.run else None, "runner": None}

    def current(run=None):
        """The trial to show: `run` if the page asked for one, else the --run folder, else the latest."""
        if run:
            rd = run_path(root, run)
            if not rd:
                raise ValueError("no trial named %r" % run)
            state = load_state(rd)
            state["dir"] = rd
            return state
        rd = cfg["fixed"]
        if not rd:
            with open(os.path.join(root, LATEST), encoding="utf-8") as f:
                rd = os.path.join(root, f.read().strip())
        state = load_state(rd)
        state["dir"] = rd
        return state

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def host_ok(self):
            host = (self.headers.get("Host") or "").lower()
            return host in ("127.0.0.1:%d" % cfg["port"], "localhost:%d" % cfg["port"])

        def send(self, code, body, ctype):
            b = body.encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(b)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(b)

        def send_json(self, code, obj):
            self.send(code, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8")

        def do_GET(self):
            if not self.host_ok():
                return self.send(403, "forbidden", "text/plain")
            url = urlsplit(self.path)
            path, run = url.path, (parse_qs(url.query).get("run") or [""])[0]
            if path not in ("/", "/trial.html", "/api/state", "/api/trials"):
                return self.send(404, "not found", "text/plain")
            if path == "/api/trials":
                return self.send_json(200, list_trials(root))
            if run and not run_path(root, run):
                return self.send(404, "court: no trial named %s" % run, "text/plain; charset=utf-8")
            try:
                data = trial_data(current(run))
                data["run"] = os.path.basename(os.path.normpath(data["dir"]))
            except (OSError, ValueError):
                data = {"empty": True, "case": "", "judge": "", "statements": [], "jurors": [], "questions": [],
                        "verdict": "", "guilty": 0, "not_guilty": 0, "no_vote": 0, "phase": "none",
                        "finished": False, "runner": None, "dir": "", "seed": None}
            data.update(live=True, ask=bool(claude), login=cfg["login"])
            if path == "/api/state":
                return self.send_json(200, data)
            data["token"] = token
            self.send(200, page_html(data), "text/html; charset=utf-8")

        def do_POST(self):
            if not self.host_ok() or self.headers.get("X-Court-Token") != token:
                return self.send_json(403, {"error": "forbidden"})
            if self.path not in ("/api/ask", "/api/trial"):
                return self.send_json(404, {"error": "not found"})
            n = int(self.headers.get("Content-Length") or 0)
            if n > 32768:
                return self.send_json(413, {"error": "내용이 너무 길어요"})
            try:
                body = json.loads(self.rfile.read(n).decode("utf-8"))
            except ValueError:
                return self.send_json(400, {"error": "잘못된 요청이에요"})
            if not claude:
                return self.send_json(503, {"error": "이 컴퓨터에서 claude 명령을 찾을 수 없어요"})
            if not cfg["login"]:
                cfg["login"] = claude_logged_in(claude)
            if self.path == "/api/trial":
                return self.new_trial(body)
            try:
                state = current(str(body.get("run") or "") or None)
            except (OSError, ValueError):
                return self.send_json(400, {"error": "그 재판을 찾을 수 없어요"})
            who, text = str(body.get("who", "")), str(body.get("q", "")).strip()
            if who not in roles(state) or not text or len(text) > 600:
                return self.send_json(400, {"error": "누구에게 무엇을 물을지 확인해 주세요 (600자 이내)"})
            rec = new_question(state, who, text)
            threading.Thread(target=answer_question, args=(state, rec, claude, args.model, slots),
                             daemon=True).start()
            self.send_json(200, {"id": rec["id"]})

        def new_trial(self, body):
            case = str(body.get("case", "")).strip()
            try:
                n = int(body.get("jury") or QUICK_JURY)
                seed = int(body["seed"]) if str(body.get("seed", "")).strip() else None
            except (TypeError, ValueError):
                return self.send_json(400, {"error": "배심원 수와 시드는 숫자로 적어 주세요"})
            if not 10 <= len(case) <= 6000:
                return self.send_json(400, {"error": "사건은 10자 이상 6000자 이하로 적어 주세요"})
            if not 3 <= n <= 12:
                return self.send_json(400, {"error": "배심원은 3명에서 12명 사이예요"})
            jury_model = str(body.get("jury_model") or "").strip() or args.jury_model or ""
            if jury_model not in JURY_MODELS and jury_model != args.jury_model:
                return self.send_json(400, {"error": "배심원 모델은 haiku, sonnet, opus 중에서 골라 주세요"})
            if not cfg["login"]:
                return self.send_json(503, {"error": NOT_LOGGED_IN})
            with QLOCK:
                if cfg["runner"] and cfg["runner"].is_alive():
                    return self.send_json(409, {"error": "이미 진행 중인 재판이 있어요. 끝난 뒤 다시 열어 주세요"})
                state = open_trial(case, n, seed)
                state["dir"] = os.path.join(root, state["dir"])
                cfg["fixed"] = None
                cfg["runner"] = threading.Thread(target=run_trial, daemon=True,
                                                 args=(state, claude, args.model, lambda m: print(m, flush=True),
                                                       jury_model or None, args.parallel))
                cfg["runner"].start()
            print("court: trial opened from the page in %s (jury of %d%s)" % (
                state["dir"], n, ", jurors on " + jury_model if jury_model else ""), flush=True)
            self.send_json(200, {"dir": os.path.abspath(state["dir"]), "calls": n + 5})

    server = None
    for port in range(args.port, args.port + 20):
        try:
            server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
            break
        except OSError:
            continue
    if not server:
        sys.exit("court: no free port from %d to %d" % (args.port, args.port + 19))
    cfg["port"] = server.server_address[1]
    print("court: courtroom is live at http://127.0.0.1:%d/" % cfg["port"], flush=True)
    cfg["login"] = bool(claude) and claude_logged_in(claude)
    if not claude:
        print("court: claude CLI not found, so the page cannot take questions", flush=True)
    elif not cfg["login"]:
        print("court: the claude CLI is not logged in, so questions will fail until you run: claude auth login",
              flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


# ---------- commands ----------

def cmd_plan(args):
    n = jury_size(args)
    calls = 2 + 2 + n + 1
    print("jury of %d: 2 opening statements, 2 rebuttals, %d jurors, 1 judge = %d sub-agent calls"
          % (n, n, calls))


def cmd_init(args):
    n = jury_size(args)
    if not os.path.exists(args.case_file):
        sys.exit("court: case file not found: %s" % args.case_file)
    case = read_text(args.case_file).strip()
    if not case:
        sys.exit("court: the case file is empty")
    state = open_trial(case, n, args.seed)
    print("court: trial opened in %s (jury of %d, seed %d)" % (state["dir"], n, state["seed"]))
    print("next: python3 court.py prompts opening")


def cmd_prompts(args):
    state = load_state()
    todo = missing(state, args.phase)
    for j in jobs(state, args.phase):
        with open(j["brief"], "w", encoding="utf-8") as f:
            f.write(brief_text(state, args.phase, j))
    if not todo:
        print("court: %s is complete. Run: court.py next" % args.phase)
        return
    for w in range(0, len(todo), WAVE):
        print("wave %d:" % (w // WAVE + 1))
        for j in todo[w:w + WAVE]:
            print("  %s  brief=%s" % (j["id"], j["brief"]))
    print("Launch one Agent call per job, one wave at a time. Prompt: "
          "\"Read <brief> and follow it exactly. It is your whole brief.\"")


def cmd_check(args):
    state = load_state()
    todo = missing(state, args.phase)
    if not todo:
        print("court: %s complete" % args.phase)
    for j in todo:
        print("missing: %s -> %s" % (j["id"], j["output"]))


def cmd_next(args):
    state = load_state()
    for phase in PHASES:
        if missing(state, phase):
            if phase == "judge":
                t = tally(state)
                print("court: the jury voted %s." % verdict_line(t))
            print("next phase: %s. Run: python3 court.py prompts %s" % (phase, phase))
            return
    print("court: the trial is over. Run: python3 court.py render")


def cmd_tally(args):
    state = load_state()
    t = tally(state)
    print(verdict_line(t))


def cmd_render(args):
    state = load_state()
    sys.stdout.write(render(state))
    replay = os.path.join(state["dir"], "trial.html")
    if os.path.exists(replay):
        print("\ncourt: courtroom replay: %s" % os.path.abspath(replay))


def main(argv=None):
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(prog="court.py")
    sub = p.add_subparsers(dest="cmd")
    pl = sub.add_parser("plan")
    pl.add_argument("--jury", type=int)
    pl.add_argument("--quick", action="store_true")
    pi = sub.add_parser("init")
    pi.add_argument("--case-file", required=True)
    pi.add_argument("--jury", type=int)
    pi.add_argument("--quick", action="store_true")
    pi.add_argument("--seed", type=int)
    for name in ("prompts", "check"):
        sp = sub.add_parser(name)
        sp.add_argument("phase", choices=PHASES)
    for name in ("next", "tally", "render"):
        sub.add_parser(name)
    pr = sub.add_parser("run")
    pr.add_argument("--model", help="model for every role (default: claude's default)")
    pr.add_argument("--jury-model", help="model for the jurors only, e.g. haiku (default: same as --model)")
    pr.add_argument("--parallel", type=int, default=WAVE, help="calls run at once per phase, 1-12 (default 6)")
    ps = sub.add_parser("serve")
    ps.add_argument("--port", type=int, default=8765)
    ps.add_argument("--run", help="trial folder to serve (default: the latest, followed as new trials open)")
    ps.add_argument("--model", help="model for page-filed trials and questions (default: claude's default)")
    ps.add_argument("--jury-model", help="default jury model for page-filed trials, e.g. haiku")
    ps.add_argument("--parallel", type=int, default=WAVE, help="calls run at once per phase, 1-12 (default 6)")
    args = p.parse_args(argv)
    if not args.cmd:
        p.print_help()
        return 1
    {"plan": cmd_plan, "init": cmd_init, "prompts": cmd_prompts, "check": cmd_check,
     "next": cmd_next, "tally": cmd_tally, "render": cmd_render, "run": cmd_run, "serve": cmd_serve}[args.cmd](args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
