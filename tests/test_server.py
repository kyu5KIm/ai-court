"""The courtroom server end to end over HTTP, with a stand-in for the claude CLI."""
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
COURT = os.path.join(HERE, "..", "skills", "court", "court.py")

# Answers like `claude -p`, by what the prompt asks. With FAKE_SLOW set it takes that long over each reply.
FAKE = r"""
import json, os, sys, time
if "--version" in sys.argv:
    print("9.9.9 (fake)"); sys.exit(0)
if "--help" in sys.argv:
    print("--print --tools --allowedTools --strict-mcp-config --no-session-persistence --output-format "
          "--verbose --include-partial-messages --model --system-prompt"); sys.exit(0)
if "auth" in sys.argv:
    print(json.dumps({"loggedIn": True})); sys.exit(0)
prompt = sys.stdin.read()
time.sleep(float(os.environ.get("FAKE_SLOW") or 0))
if "You are JUROR" in prompt:
    text = "VOTE: GUILTY\\nREASON: thin\\nDECIDING FACT: savings\\nWOULD FLIP IF: more sales"
elif "You are the JUDGE" in prompt:
    text = "## Conditions for acquittal\\n1. Sell more\\n\\n## The sentence\\nWait."
elif "JSON array" in prompt:
    text = json.dumps([{"reason": "r", "fact": "f", "flip": "x"}] * 3)
elif prompt.startswith("Translate"):
    text = "TRANSLATED"
elif "### ask" in prompt or "=== 질문 ===" in prompt:
    text = "An answer from the record."
else:
    text = "1. a point"
print(json.dumps({"type": "stream_event", "event": {"delta": {"type": "text_delta", "text": text[:4]}}}), flush=True)
print(json.dumps({"type": "result", "is_error": False, "result": text,
                  "usage": {"input_tokens": 100, "output_tokens": 20}}), flush=True)
"""


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Server:
    def __init__(self, folder, home, claude, slow=0):
        self.port = free_port()
        env = dict(os.environ, COURT_CLAUDE=claude, COURT_HOME=home, FAKE_SLOW=str(slow), PYTHONIOENCODING="utf-8")
        self.proc = subprocess.Popen([sys.executable, COURT, "serve", "--port", str(self.port)], cwd=folder, env=env,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.base = "http://127.0.0.1:%d/" % self.port
        for _ in range(100):
            try:
                page = self.get("").decode("utf-8")
                break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("the server did not start")
        self.token = re.search(r'"token": "([^"]+)"', page).group(1)

    def get(self, path):
        with urllib.request.urlopen(self.base + path, timeout=10) as r:
            return r.read()

    def state(self, run=""):
        return json.loads(self.get("api/state" + ("?run=" + run if run else "")))

    def post(self, path, body, token=None):
        req = urllib.request.Request(self.base + path, json.dumps(body).encode("utf-8"), headers={
            "Content-Type": "application/json", "X-Court-Token": self.token if token is None else token})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            with e:
                return e.code, json.loads(e.read())

    def wait(self, test, what, seconds=60, run=""):
        end = time.time() + seconds
        while time.time() < end:
            d = self.state(run)
            if test(d):
                return d
            time.sleep(0.1)
        raise AssertionError("timed out waiting for %s; last state: %s" % (what, json.dumps(d.get("runner"))[:300]))

    def stop(self):
        if os.name == "nt":
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(self.proc.pid)], capture_output=True)
        else:
            self.proc.kill()
        self.proc.wait()


CASE = "Open a second candle shop across town next spring with the savings I have."


class ServerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.home = os.path.join(self.tmp, "home")
        self.folder = os.path.join(self.tmp, "work")
        os.makedirs(self.folder)
        script = os.path.join(self.tmp, "fake_claude.py")
        with open(script, "w", encoding="utf-8") as f:
            f.write(FAKE)
        if os.name == "nt":
            self.claude = os.path.join(self.tmp, "fake_claude.cmd")
            with open(self.claude, "w") as f:
                f.write('@"%s" "%s" %%*\n' % (sys.executable, script))
        else:
            self.claude = os.path.join(self.tmp, "fake_claude")
            with open(self.claude, "w") as f:
                f.write('#!/bin/sh\nexec "%s" "%s" "$@"\n' % (sys.executable, script))
            os.chmod(self.claude, 0o755)
        self.servers = []

    def tearDown(self):
        for s in self.servers:
            s.stop()
        for _ in range(20):
            shutil.rmtree(self.tmp, ignore_errors=True)
            if not os.path.exists(self.tmp):
                break
            time.sleep(0.25)

    def server(self, slow=0):
        s = Server(self.folder, self.home, self.claude, slow)
        self.servers.append(s)
        return s

    def done(self, d):
        return d.get("runner") and d["runner"]["status"] == "done"

    def test_refuses_a_missing_token(self):
        s = self.server()
        self.assertEqual(s.post("api/trial", {"case": CASE}, token="wrong")[0], 403)

    def test_files_a_case_answers_a_question_and_translates(self):
        s = self.server()
        code, opened = s.post("api/trial", {"case": CASE, "jury": 3})
        self.assertEqual((code, opened["queued"]), (200, False))
        d = s.wait(self.done, "the verdict")
        self.assertTrue(d["finished"])
        self.assertEqual(d["verdict"], "GUILTY")
        self.assertEqual(len(d["runner"]["calls"]), 8)

        self.assertEqual(s.post("api/ask", {"who": "judge", "q": "why?", "lang": "en"})[0], 200)
        d = s.wait(lambda d: d["questions"] and d["questions"][0]["status"] == "done", "the answer")
        self.assertEqual(d["questions"][0]["answer"], "An answer from the record.")

        self.assertEqual(s.post("api/translate", {"lang": "ko"})[0], 200)
        d = s.wait(lambda d: (d["translations"].get("ko") or {}).get("status") == "done", "the translation")
        self.assertEqual(d["translations"]["ko"]["docs"]["judge"], "TRANSLATED")
        self.assertEqual(d["translations"]["ko"]["docs"]["jurors"][0]["reason"], "r")

    def test_second_case_waits_in_line_and_a_queued_one_can_be_cancelled(self):
        s = self.server(slow=0.5)
        self.assertEqual(s.post("api/trial", {"case": CASE, "jury": 3})[1]["queued"], False)
        time.sleep(1.1)  # run names have one-second resolution
        second = s.post("api/trial", {"case": CASE + " Second.", "jury": 3})[1]
        self.assertTrue(second["queued"])
        d = s.state(second["run"])
        self.assertEqual((d["runner"]["status"], d["ahead"]), ("queued", 1))
        self.assertNotEqual(s.state()["run"], second["run"])  # the running trial stays the latest
        time.sleep(1.1)
        third = s.post("api/trial", {"case": CASE + " Third.", "jury": 3})[1]
        self.assertEqual(s.state(third["run"])["ahead"], 2)
        self.assertEqual(s.post("api/cancel", {"run": third["run"]})[1]["status"], "cancelled")
        s.wait(self.done, "the second trial", run=second["run"])
        self.assertEqual(s.state()["run"], second["run"])  # it became the latest when it started
        self.assertEqual(s.state(third["run"])["runner"]["status"], "cancelled")

    def test_stop_then_resume_finishes_the_same_trial(self):
        s = self.server(slow=1)
        s.post("api/trial", {"case": CASE, "jury": 3})
        s.wait(lambda d: d["runner"] and d["runner"]["status"] == "running" and d["statements"][0]["text"], "the openings")
        self.assertEqual(s.post("api/cancel", {})[1]["status"], "cancelling")
        d = s.wait(lambda d: d["runner"]["status"] == "cancelled", "the stop")
        self.assertFalse(d["finished"])
        self.assertTrue(d["statements"][0]["text"])  # what was finished stays
        self.assertEqual(s.post("api/cancel", {})[0], 409)
        self.assertEqual(s.post("api/resume", {})[0], 200)
        d = s.wait(self.done, "the resumed verdict")
        self.assertEqual(d["no_vote"], 0)

    def test_a_trial_cut_off_by_a_dead_server_resumes_after_a_restart(self):
        s = self.server(slow=1)
        s.post("api/trial", {"case": CASE, "jury": 3})
        s.wait(lambda d: d["statements"][0]["text"], "the openings")
        run = s.state()["run"]
        s.stop()
        self.servers.remove(s)
        # Backdate the heartbeat rather than wait a minute for it to go stale.
        old = time.time() - 120
        os.utime(os.path.join(self.folder, ".court", run, "runner.alive"), (old, old))

        s = self.server()
        d = s.state()
        self.assertEqual((d["run"], d["runner"]["status"]), (run, "interrupted"))
        self.assertEqual(s.post("api/resume", {})[0], 200)
        d = s.wait(self.done, "the resumed verdict")
        self.assertEqual((d["verdict"], d["no_vote"]), ("GUILTY", 0))
        self.assertEqual(sum(1 for k in d["runner"]["calls"] if k.startswith("jury/")), 3)

    def test_past_trials_span_folders_and_can_be_opened_from_another(self):
        other = os.path.join(self.tmp, "other")
        os.makedirs(other)
        env = dict(os.environ, COURT_HOME=self.home, PYTHONIOENCODING="utf-8")
        with open(os.path.join(other, "case.md"), "w", encoding="utf-8") as f:
            f.write(CASE)
        os.makedirs(os.path.join(other, ".court"))
        subprocess.run([sys.executable, COURT, "init", "--case-file", "case.md", "--jury", "3"], cwd=other, env=env,
                       check=True, stdout=subprocess.DEVNULL)
        s = self.server()
        trials = json.loads(s.get("api/trials"))
        self.assertEqual([t["here"] for t in trials], [False])
        self.assertEqual(s.state(trials[0]["run"])["case"], CASE)


if __name__ == "__main__":
    unittest.main()
