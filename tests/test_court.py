import json
import os
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

    def test_run_trial_without_a_session(self):
        state = self.open_trial("--jury", "3")
        prompts = []

        def fake(claude, model, prompt, cwd, timeout=600):
            prompts.append(prompt)
            if "You are JUROR" in prompt:
                return "VOTE: GUILTY\nREASON: thin record"
            return "## The sentence\nWait." if "You are the JUDGE" in prompt else "1. point"

        real, court.claude_text = court.claude_text, fake
        try:
            court.run_trial(state, "claude", log=lambda m: None)
        finally:
            court.claude_text = real
        self.assertEqual(len(prompts), 2 + 2 + 3 + 1)
        self.assertTrue(any("Quit my job to sell candles" in p for p in prompts))
        self.assertEqual(court.read_json(os.path.join(state["dir"], "runner.json"))["status"], "done")
        self.assertIn("GUILTY, 3 to 0", open(os.path.join(state["dir"], "VERDICT.md"), encoding="utf-8").read())

    def test_run_trial_stops_when_the_judge_fails(self):
        state = self.open_trial("--jury", "3")

        def fake(claude, model, prompt, cwd, timeout=600):
            if "You are the JUDGE" in prompt:
                raise RuntimeError("down")
            return "VOTE: GUILTY" if "You are JUROR" in prompt else "1. point"

        real, court.claude_text = court.claude_text, fake
        try:
            court.run_trial(state, "claude", log=lambda m: None)
        finally:
            court.claude_text = real
        runner = court.read_json(os.path.join(state["dir"], "runner.json"))
        self.assertEqual(runner["status"], "error")
        self.assertIn("down", runner["message"])


if __name__ == "__main__":
    unittest.main()
