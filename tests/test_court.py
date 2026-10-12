import json
import os
import re
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.join(HERE, "..", "skills", "court")
sys.path.insert(0, SKILL)
import court  # noqa: E402


class CourtTest(unittest.TestCase):
    def setUp(self):
        self.old = os.getcwd()
        self.tmp = tempfile.mkdtemp()
        os.chdir(self.tmp)
        os.makedirs(".court")
        with open(".court/case.md", "w") as f:
            f.write("Quit my job to sell candles on Etsy full time\n\nI have $8,000 saved.\n")

    def tearDown(self):
        os.chdir(self.old)
        shutil.rmtree(self.tmp)

    def open_trial(self, *extra):
        court.main(["init", "--case-file", ".court/case.md", "--seed", "7"] + list(extra))
        return court.load_state()

    def write_all(self, state, phase, text):
        for j in court.jobs(state, phase):
            with open(j["output"], "w") as f:
                f.write(text)

    def test_jurors_are_distinct(self):
        jurors = court.load_jurors()
        self.assertEqual(len(jurors), 12)
        self.assertEqual(len({j["name"] for j in jurors}), 12)

    def test_quick_jury_is_six_distinct(self):
        state = self.open_trial("--quick")
        self.assertEqual(len(state["jury"]), 6)
        self.assertEqual(len({j["name"] for j in state["jury"]}), 6)

    def test_briefs_name_their_output_and_the_record(self):
        state = self.open_trial("--jury", "3")
        court.main(["prompts", "jury"])
        j = court.jobs(state, "jury")[0]
        text = open(j["brief"]).read()
        self.assertIn(j["output"], text)
        self.assertIn("VOTE: GUILTY or NOT GUILTY", text)
        self.assertIn(os.path.abspath(os.path.join(state["dir"], "rebuttal", "defense.md")), text)

    def test_parse_vote_variants(self):
        v = court.parse_vote("VOTE: NOT GUILTY\nREASON: it pays.\nDECIDING FACT: $8,000\nWOULD FLIP IF: no savings")
        self.assertEqual(v["vote"], "NOT GUILTY")
        self.assertEqual(v["flip"], "no savings")
        self.assertEqual(court.parse_vote("**VOTE:** guilty\nREASON: x")["vote"], "GUILTY")
        self.assertIsNone(court.parse_vote("NO VOTE"))

    def test_full_trial_tally_and_render(self):
        state = self.open_trial("--jury", "5")
        self.write_all(state, "opening", "1. point")
        self.write_all(state, "rebuttal", "1. answer")
        votes = ["GUILTY", "GUILTY", "NOT GUILTY", "GUILTY", "NO VOTE"]
        for j, v in zip(court.jobs(state, "jury"), votes):
            with open(j["output"], "w") as f:
                f.write("NO VOTE" if v == "NO VOTE" else "VOTE: %s\nREASON: because | pipes\n" % v)
        t = court.tally(state)
        self.assertEqual((t["verdict"], t["guilty"], t["not_guilty"], t["no_vote"]), ("GUILTY", 3, 1, 1))
        self.assertEqual(court.verdict_line(t), "GUILTY, 3 to 1")
        self.write_all(state, "judge", "## The sentence\nKeep the job for now.")
        text = court.render(state)
        self.assertIn("# The verdict: GUILTY, 3 to 1", text)
        self.assertIn("Quit my job to sell candles", text)
        self.assertIn("because / pipes", text)
        self.assertIn("## The sentence", text)
        self.assertTrue(text.rstrip().endswith(court.CREDIT))

    def test_hung_jury(self):
        state = self.open_trial("--jury", "4")
        for j, v in zip(court.jobs(state, "jury"), ["GUILTY", "NOT GUILTY", "GUILTY", "NOT GUILTY"]):
            with open(j["output"], "w") as f:
                f.write("VOTE: %s\n" % v)
        self.assertEqual(court.verdict_line(court.tally(state)), "HUNG JURY, 2 to 2")

    def test_next_walks_the_phases(self):
        state = self.open_trial("--jury", "3")
        self.assertTrue(court.missing(state, "opening"))
        self.write_all(state, "opening", "x")
        self.assertFalse(court.missing(state, "opening"))
        self.assertTrue(court.missing(state, "rebuttal"))

    def test_non_ascii_case_round_trips_as_utf8(self):
        with open(".court/case.md", "w", encoding="utf-8") as f:
            f.write("퇴사하고 캔들을 팔 거야. 저축 800만 원.\n")
        state = self.open_trial("--jury", "3")
        for j in court.jobs(state, "jury"):
            with open(j["output"], "w", encoding="utf-8") as f:
                f.write("VOTE: GUILTY\nREASON: 생활비가 모자라요.\n")
        text = court.render(state)
        self.assertIn("퇴사하고 캔들을 팔 거야", text)
        self.assertIn("생활비가 모자라요", open(os.path.join(state["dir"], "trial.html"), encoding="utf-8").read())

    def test_trial_data_follows_a_trial_in_progress(self):
        state = self.open_trial("--jury", "3")
        d = court.trial_data(state)
        self.assertEqual((d["phase"], d["finished"]), ("opening", False))
        self.write_all(state, "opening", "1. point")
        self.write_all(state, "rebuttal", "1. answer")
        with open(court.jobs(state, "jury")[0]["output"], "w") as f:
            f.write("VOTE: NOT GUILTY\nREASON: fine\n")
        d = court.trial_data(state)
        self.assertEqual(d["phase"], "jury")
        self.assertEqual([j["voted"] for j in d["jurors"]], [True, False, False])
        self.assertEqual(d["statements"][3]["text"], "1. answer")

    def test_page_data_cannot_close_the_script_tag(self):
        state = self.open_trial("--jury", "3")
        self.write_all(state, "opening", "</script><b>x</b>")
        html = court.page_html(court.trial_data(state))
        self.assertEqual(html.count("</script>"), 2)

    def test_page_is_one_self_contained_file(self):
        html = court.page_html(court.trial_data(self.open_trial("--jury", "3")))
        self.assertNotIn('<link rel="stylesheet"', html)
        self.assertNotIn('type="module"', html)
        styles = os.listdir(os.path.join(court.WEB, "styles"))
        self.assertEqual(html.count("<style>"), len(styles))
        script = html.split('<script>\n', 1)[1]
        self.assertNotRegex(script, r"(?m)^\s*(import|export)\b")
        for module in ("js/main.js", "js/core/state.js", "js/stage/cast.js", "js/player/player.js", "js/live/poll.js"):
            self.assertIn("// " + module + "\n", script)

    def test_joined_modules_do_not_reuse_a_top_level_name(self):
        js = court.bundle_js(os.path.join(court.WEB, "js", "main.js"))
        names = re.findall(r"(?m)^(?:async )?(?:function|const|let|class) ([\w$]+)", js)
        self.assertEqual(sorted(n for n in set(names) if names.count(n) > 1), [])

    def test_bundler_refuses_imports_it_cannot_join(self):
        entry = os.path.join(self.tmp, "entry.js")
        with open(entry, "w", encoding="utf-8") as f:
            f.write('import a from "./a.js";\na();\n')
        with self.assertRaises(ValueError):
            court.bundle_js(entry)

    def run_with(self, state, answer):
        """run_trial with claude_call replaced by `answer(prompt) -> text` (or an exception)."""
        def fake(claude, model, prompt, cwd, timeout=600, on_text=None, system=None):
            self.systems.append(system)
            text = answer(prompt)
            if on_text:
                on_text(text[:3])
                on_text(text)
            return {"text": text, "seconds": 0.2, "first_text": 0.1, "input": 50, "cache_read": 0,
                    "cache_write": 0, "output": 7}
        self.systems = []
        real, court.claude_call = court.claude_call, fake
        try:
            court.run_trial(state, "claude", log=lambda m: None)
        finally:
            court.claude_call = real
        return court.read_json(os.path.join(state["dir"], "runner.json"))

    def test_run_trial_without_a_session(self):
        state = self.open_trial("--jury", "3")
        prompts = []

        def answer(prompt):
            prompts.append(prompt)
            if "You are JUROR" in prompt:
                return "VOTE: GUILTY\nREASON: thin record"
            return "## The sentence\nWait." if "You are the JUDGE" in prompt else "1. point"

        runner = self.run_with(state, answer)
        self.assertEqual(len(prompts), 2 + 2 + 3 + 1)
        self.assertTrue(any("Quit my job to sell candles" in p for p in prompts))
        self.assertEqual(runner["status"], "done")
        self.assertEqual(sorted(runner["calls"]), sorted(
            ["opening/prosecution", "opening/defense", "rebuttal/prosecution", "rebuttal/defense",
             "jury/juror-01", "jury/juror-02", "jury/juror-03", "judge/judge"]))
        self.assertEqual(runner["calls"]["judge/judge"]["output"], 7)
        self.assertEqual(set(self.systems), {court.TRIAL_SYSTEM})
        self.assertIn("GUILTY, 3 to 0", open(os.path.join(state["dir"], "VERDICT.md"), encoding="utf-8").read())

    def test_run_trial_stops_when_the_judge_fails(self):
        state = self.open_trial("--jury", "3")

        def answer(prompt):
            if "You are the JUDGE" in prompt:
                raise RuntimeError("down")
            return "VOTE: GUILTY" if "You are JUROR" in prompt else "1. point"

        runner = self.run_with(state, answer)
        self.assertEqual(runner["status"], "error")
        self.assertIn("down", runner["message"])
        self.assertIn("jury/juror-03", runner["calls"])

    def fake_cli(self, lines):
        """An executable that prints `lines` (stream-json events) the way `claude -p` does."""
        script = os.path.join(self.tmp, "fake_claude.py")
        with open(script, "w", encoding="utf-8") as f:
            f.write("import sys\nsys.stdin.read()\n")
            for line in lines:
                f.write("print(%r, flush=True)\n" % json.dumps(line))
        if os.name == "nt":
            exe = os.path.join(self.tmp, "fake_claude.cmd")
            with open(exe, "w") as f:
                f.write('@"%s" "%s" %%*\n' % (sys.executable, script))
        else:
            exe = os.path.join(self.tmp, "fake_claude")
            with open(exe, "w") as f:
                f.write('#!/bin/sh\nexec "%s" "%s" "$@"\n' % (sys.executable, script))
            os.chmod(exe, 0o755)
        return exe

    def test_claude_call_streams_and_reports_cost(self):
        delta = lambda t: {"type": "stream_event", "event": {"type": "content_block_delta",
                                                              "delta": {"type": "text_delta", "text": t}}}
        exe = self.fake_cli([{"type": "system"}, delta("유죄"), delta("입니다"),
                             {"type": "result", "is_error": False, "result": "유죄입니다",
                              "usage": {"input_tokens": 12, "cache_read_input_tokens": 900,
                                        "cache_creation_input_tokens": 0, "output_tokens": 4}}])
        seen = []
        c = court.claude_call(exe, None, "prompt", self.tmp, on_text=seen.append)
        self.assertEqual(c["text"], "유죄입니다")
        self.assertEqual(seen, ["유죄", "유죄입니다"])
        self.assertEqual((c["input"], c["cache_read"], c["output"]), (12, 900, 4))
        self.assertIsNotNone(c["first_text"])

    def test_claude_call_reports_an_error_result(self):
        exe = self.fake_cli([{"type": "result", "is_error": True, "result": "Not logged in · Please run /login"}])
        with self.assertRaises(RuntimeError) as e:
            court.claude_call(exe, None, "prompt", self.tmp)
        self.assertIn("claude auth login", str(e.exception))

if __name__ == "__main__":
    unittest.main()
