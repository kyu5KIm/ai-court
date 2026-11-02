import json
import os
import re
import shutil
import sys
import tempfile
import time
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
        self.old_home = os.environ.get("COURT_HOME")
        os.environ["COURT_HOME"] = os.path.join(self.tmp, "home")  # never the real ~/.court
        os.makedirs(".court")
        with open(".court/case.md", "w") as f:
            f.write("Quit my job to sell candles on Etsy full time\n\nI have $8,000 saved.\n")

    def tearDown(self):
        os.chdir(self.old)
        if self.old_home is None:
            del os.environ["COURT_HOME"]
        else:
            os.environ["COURT_HOME"] = self.old_home
        # On Windows a killed child can hold its working folder for a moment longer.
        for _ in range(20):
            shutil.rmtree(self.tmp, ignore_errors=True)
            if not os.path.exists(self.tmp):
                break
            time.sleep(0.25)

    def open_trial(self, *extra):
        court.main(["init", "--case-file", ".court/case.md", "--seed", "7"] + list(extra))
        return court.load_state()

    def write_all(self, state, phase, text):
        for j in court.jobs(state, phase):
            with open(j["output"], "w", encoding="utf-8") as f:
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

    def test_each_juror_reads_the_sides_in_its_own_seeded_order(self):
        state = self.open_trial()
        orders = [court.statement_order(state, "juror-%02d" % i) for i in range(1, 13)]
        self.assertEqual(len({tuple(o) for o in orders}), 2)  # both orders turn up among 12 seats
        self.assertEqual(orders, [court.statement_order(state, "juror-%02d" % i) for i in range(1, 13)])
        for order in orders:
            self.assertEqual(order[0].split("/")[1], order[2].split("/")[1])  # same side first in both rounds

    def test_mixed_jury_rotates_models_by_seat(self):
        state = self.open_trial("--jury", "4")
        runner = self.run_with(state, lambda p: "VOTE: GUILTY" if "You are JUROR" in p else "1. point",
                               model="sonnet", jury_model="mixed")
        self.assertEqual([runner["calls"]["jury/juror-%02d" % i]["model"] for i in range(1, 5)],
                         ["haiku", "sonnet", "opus", "haiku"])
        self.assertEqual(runner["calls"]["judge/judge"]["model"], "sonnet")

    def test_judge_is_asked_what_nobody_checked_and_verdict_carries_the_caveat(self):
        state = self.open_trial("--jury", "3")
        self.assertIn("## What nobody checked", court.brief_text(state, "judge", court.jobs(state, "judge")[0]))
        self.assertIn(court.DISCLAIMER, court.render(state))

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

    def test_every_page_text_key_has_both_languages(self):
        """A key missing from i18n.js would show up on the page as the raw key, so catch typos here."""
        web = court.WEB
        i18n = court.read_text(os.path.join(web, "js", "core", "i18n.js"))
        block = i18n.split("const STR = {", 1)[1].split("\n};", 1)[0]
        defined = set(re.findall(r"(?m)^  (\w+): \[", block))
        used = set()
        for folder, _, files in os.walk(os.path.join(web, "js")):
            for name in files:
                used |= set(re.findall(r'\bt\("(\w+)"', court.read_text(os.path.join(folder, name))))
        html = court.read_text(os.path.join(web, "index.html"))
        used |= set(re.findall(r'data-i18n(?:-title|-placeholder|-aria)?="(\w+)"', html))
        self.assertEqual(sorted(used - set(defined)), [])
        self.assertGreater(len(used), 100)

    def test_bundler_names_both_files_when_a_top_level_name_is_reused(self):
        entry = os.path.join(self.tmp, "entry.js")
        with open(os.path.join(self.tmp, "a.js"), "w", encoding="utf-8") as f:
            f.write("export function same() {}\n")
        with open(entry, "w", encoding="utf-8") as f:
            f.write('import { same } from "./a.js";\nfunction same() {}\n')
        with self.assertRaises(ValueError) as e:
            court.bundle_js(entry)
        self.assertIn("same", str(e.exception))
        self.assertIn("a.js", str(e.exception))
        self.assertIn("entry.js", str(e.exception))

    def test_bundler_joins_an_aliased_import(self):
        entry = os.path.join(self.tmp, "entry.js")
        with open(os.path.join(self.tmp, "a.js"), "w", encoding="utf-8") as f:
            f.write("export function one() {}\nexport const two = 2;\n")
        with open(entry, "w", encoding="utf-8") as f:
            f.write('import { one, two as deux } from "./a.js";\none(deux);\n')
        js = court.bundle_js(entry)
        self.assertIn("const deux = two;", js)
        self.assertNotIn("import", js)

    def module_sources(self):
        out = {}
        for folder, _, files in os.walk(os.path.join(court.WEB, "js")):
            for name in files:
                out[os.path.normpath(os.path.join(folder, name))] = court.read_text(os.path.join(folder, name))
        return out

    def test_every_imported_name_is_exported_by_its_module(self):
        """The joined page has one scope, so a mistyped import would only fail when that line runs."""
        sources = self.module_sources()
        checked = 0
        for path, src in sources.items():
            for names, rel in court.IMPORT_RE.findall(src):
                target = os.path.normpath(os.path.join(os.path.dirname(path), rel))
                self.assertIn(target, sources, "%s imports %s" % (path, rel))
                exported = set(re.findall(r"^export (?:async )?(?:function\*?|const|let|class) ([\w$]+)", sources[target], re.M))
                for name in names.split(","):
                    name = re.split(r"\s+as\s+", name.strip())[0]
                    if name:
                        self.assertIn(name, exported, "%s imports %s from %s" % (path, name, rel))
                        checked += 1
        self.assertGreater(checked, 100)

    def test_every_element_the_scripts_look_up_is_on_the_page(self):
        html = court.read_text(os.path.join(court.WEB, "index.html"))
        ids = set(re.findall(r'\bid="([\w-]+)"', html))
        made_by_script = {"b-replay-copy", "b-intro", "b-intro-new"}
        for path, src in self.module_sources().items():
            for found in re.findall(r'\$\("#([\w-]+)"\)', src):
                self.assertIn(found, ids | made_by_script, "%s looks up #%s" % (path, found))

    def test_plugin_version_matches_the_script(self):
        with open(os.path.join(SKILL, "..", "..", ".claude-plugin", "plugin.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f)["version"], court.VERSION)

    def test_doctor_reports_flags_the_cli_no_longer_lists(self):
        exe = self.fake_cli([])
        self.assertEqual(len(court.cli_problems(exe)), len(court.CLI_FLAGS))

    def test_update_replaces_web_and_refuses_what_is_not_the_skill(self):
        src, dest = os.path.join(self.tmp, "src"), os.path.join(self.tmp, "dest")
        for folder in (os.path.join(src, "web", "js"), os.path.join(dest, "web")):
            os.makedirs(folder)
        for path, text in ((os.path.join(src, "court.py"), "new"), (os.path.join(src, "web", "js", "a.js"), "a"),
                           (os.path.join(dest, "court.py"), "old"), (os.path.join(dest, "web", "gone.js"), "x")):
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
        with self.assertRaises(ValueError):
            court.apply_update(os.path.join(self.tmp, "nope"), dest)
        self.assertTrue(os.path.exists(os.path.join(dest, "web", "gone.js")))
        court.apply_update(src, dest)
        self.assertEqual(court.read_text(os.path.join(dest, "court.py")), "new")
        self.assertTrue(os.path.exists(os.path.join(dest, "web", "js", "a.js")))
        self.assertFalse(os.path.exists(os.path.join(dest, "web", "gone.js")))

    def test_versions_compare_as_numbers(self):
        self.assertGreater(court.version_tuple("1.10.0"), court.version_tuple("1.9.9"))

    def test_bundler_refuses_imports_it_cannot_join(self):
        entry = os.path.join(self.tmp, "entry.js")
        with open(entry, "w", encoding="utf-8") as f:
            f.write('import a from "./a.js";\na();\n')
        with self.assertRaises(ValueError):
            court.bundle_js(entry)

    def run_with(self, state, answer, **kw):
        """run_trial with claude_call replaced by `answer(prompt) -> text` (or an exception)."""
        def fake(claude, model, prompt, cwd, timeout=600, on_text=None, system=None, tools="", cancel=None):
            self.systems.append(system)
            self.tools.append(tools)
            self.models.append(("JUROR" in prompt, model))
            text = answer(prompt)
            if on_text:
                on_text(text[:3])
                on_text(text)
            return {"text": text, "seconds": 0.2, "first_text": 0.1, "input": 50, "cache_read": 0,
                    "cache_write": 0, "output": 7}
        self.systems, self.models, self.tools = [], [], []
        real, court.claude_call = court.claude_call, fake
        try:
            court.run_trial(state, "claude", log=lambda m: None, **kw)
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

    def test_jury_model_only_applies_to_jurors(self):
        state = self.open_trial("--jury", "3")
        runner = self.run_with(state, lambda p: "VOTE: GUILTY" if "You are JUROR" in p else "1. point",
                               model="sonnet", jury_model="haiku")
        self.assertEqual({m for juror, m in self.models if juror}, {"haiku"})
        self.assertEqual({m for juror, m in self.models if not juror}, {"sonnet"})
        self.assertEqual(runner["calls"]["jury/juror-01"]["model"], "haiku")

    def test_parallel_caps_calls_at_once(self):
        import threading
        for parallel, expected in ((1, 1), (12, 6)):
            state = self.open_trial("--jury", "6")
            live, peak, cond = [0], [0], threading.Condition()

            def answer(prompt):
                juror = "You are JUROR" in prompt
                with cond:
                    live[0] += 1
                    peak[0] = max(peak[0], live[0])
                    cond.notify_all()
                    # Jurors hold until as many as the cap allows are in, so the peak never depends on timing.
                    if juror:
                        cond.wait_for(lambda: live[0] >= expected, timeout=2)
                with cond:
                    live[0] -= 1
                return "VOTE: GUILTY" if juror else "1. point"

            self.run_with(state, answer, parallel=parallel)
            self.assertEqual(peak[0], expected)
            shutil.rmtree(".court")
            os.makedirs(".court")
            with open(".court/case.md", "w") as f:
                f.write("Quit my job to sell candles on Etsy full time\n")

    def test_drafts_are_served_while_writing_and_cleared_after(self):
        state = self.open_trial("--jury", "3")
        job = court.jobs(state, "opening")[0]
        court.write_draft(court.draft_path(job), "1. half a poi")
        self.assertEqual(court.trial_data(state)["drafts"], {"opening/prosecution": "1. half a poi"})
        court.write_text(job["output"], "1. a point\n")
        self.assertEqual(court.trial_data(state)["drafts"], {})  # a finished job hides its draft
        court.drop_draft(court.draft_path(job))
        self.run_with(state, lambda p: "VOTE: GUILTY" if "You are JUROR" in p else "1. point")
        left = [f for d, _, fs in os.walk(state["dir"]) for f in fs if f.endswith((".draft", ".tmp"))]
        self.assertEqual(left, [])

    @staticmethod
    def juror_or_point(prompt):
        if "You are JUROR" in prompt:
            return "VOTE: GUILTY\nREASON: thin"
        return "## The sentence\nWait." if "You are the JUDGE" in prompt else "1. point"

    def test_a_stopped_trial_resumes_with_only_what_is_missing(self):
        state = self.open_trial("--jury", "3")

        def down_at_jury(prompt):
            if "You are JUROR" in prompt:
                raise RuntimeError("down")
            return self.juror_or_point(prompt)

        first = self.run_with(state, down_at_jury)
        self.assertEqual(first["status"], "done")  # jurors that fail twice are NO VOTE, as before
        state = self.open_trial("--jury", "3")

        def judge_down(prompt):
            if "You are the JUDGE" in prompt:
                raise RuntimeError("down")
            return self.juror_or_point(prompt)

        self.assertEqual(self.run_with(state, judge_down)["status"], "error")
        calls = []
        again = self.run_with(state, lambda p: calls.append(p) or self.juror_or_point(p))
        self.assertEqual(again["status"], "done")
        self.assertEqual(len(calls), 1)  # only the judge
        self.assertIn("opening/prosecution", again["calls"])  # earlier calls stay on the bill
        self.assertTrue(os.path.exists(os.path.join(state["dir"], "VERDICT.md")))

    def test_rate_limit_waits_then_stops_without_costing_a_vote(self):
        state = self.open_trial("--jury", "3")
        seen = []

        def limited(prompt):
            if "You are JUROR" in prompt:
                seen.append(1)
                raise court.RateLimited("You've hit your limit")
            return self.juror_or_point(prompt)

        waits, court.RATE_WAITS = court.RATE_WAITS, (0, 0)
        try:
            runner = self.run_with(state, limited)
        finally:
            court.RATE_WAITS = waits
        self.assertEqual(runner["status"], "error")
        self.assertIn("한도", runner["message"])
        self.assertEqual(len(seen), 3 * 3)  # three jurors, each tried three times, and no second round
        self.assertEqual(court.count_votes(state)["no_vote"], 3)
        self.assertTrue(all(not court.done(j) for j in court.jobs(state, "jury")))  # no NO VOTE written

    def test_a_reply_without_a_vote_is_tried_again(self):
        state = self.open_trial("--jury", "3")
        replies = {}

        def answer(prompt):
            if "You are JUROR" in prompt:
                replies[prompt] = replies.get(prompt, 0) + 1
                return "I think it fails." if replies[prompt] == 1 else "VOTE: GUILTY\nREASON: thin"
            return self.juror_or_point(prompt)

        self.run_with(state, answer)
        self.assertEqual(court.count_votes(state)["guilty"], 3)

    def test_cancel_stops_before_any_no_vote_is_written(self):
        state = self.open_trial("--jury", "3")

        def answer(prompt):
            if "You are JUROR" in prompt:
                court.write_text(court.cancel_path(state), "")
                time.sleep(1.5)  # the heartbeat notices within a second
                raise RuntimeError("killed")
            return self.juror_or_point(prompt)

        runner = self.run_with(state, answer)
        self.assertEqual(runner["status"], "cancelled")
        self.assertTrue(all(not court.done(j) for j in court.jobs(state, "jury")))

    def test_a_run_whose_heartbeat_stopped_reads_as_interrupted(self):
        state = self.open_trial("--jury", "3")
        court.set_runner(state, "running", "", "opening", {}, 1.0)
        self.assertEqual(court.trial_data(state)["runner"]["status"], "interrupted")
        court.touch_alive(state)
        self.assertEqual(court.trial_data(state)["runner"]["status"], "running")
        old = time.time() - court.ALIVE_STALE - 5
        os.utime(court.alive_path(state), (old, old))
        self.assertEqual(court.trial_data(state)["runner"]["status"], "interrupted")

    def test_research_gives_only_the_openings_web_search(self):
        with open(".court/case.md", "w", encoding="utf-8") as f:
            f.write("Quit my job to sell candles on Etsy full time\n")
        state = court.open_trial("Quit my job to sell candles on Etsy full time", 3, 7, research=True)
        prompts = []
        self.run_with(state, lambda p: prompts.append(p) or self.juror_or_point(p))
        self.assertEqual(sorted(self.tools), [""] * 6 + ["WebSearch"] * 2)
        self.assertEqual(sum("source URL" in p for p in prompts), 2)

    def test_prompts_drop_long_paths_and_the_judge_gets_each_vote_once(self):
        state = self.open_trial("--jury", "3")
        self.write_all(state, "opening", "1. point")
        self.write_all(state, "rebuttal", "1. answer")
        for j in court.jobs(state, "jury"):
            court.write_text(j["output"], "VOTE: GUILTY\nREASON: unique-reason\n")
        court.tally(state)
        prompt = court.headless_prompt(state, "judge", court.jobs(state, "judge")[0])
        self.assertNotIn(os.path.abspath(state["dir"]), prompt)
        self.assertEqual(prompt.count("unique-reason"), 3)

    def test_past_trials_are_listed_newest_first(self):
        first = self.open_trial("--jury", "3")
        for j in court.jobs(first, "jury"):
            court.write_text(j["output"], "VOTE: NOT GUILTY\n")
        os.rename(first["dir"], os.path.join(".court", "20200101-000000"))
        self.open_trial("--jury", "3")
        trials = court.list_trials(".")
        self.assertEqual(len(trials), 2)
        self.assertTrue(trials[0]["latest"] and not trials[1]["latest"])
        self.assertEqual(trials[1]["run"], "20200101-000000")
        self.assertEqual((trials[1]["verdict"], trials[1]["not_guilty"]), ("NOT GUILTY", 3))
        self.assertIsNone(trials[0]["verdict"])  # nobody has voted yet
        self.assertIn("Quit my job", trials[0]["case"])

    def test_trials_in_other_folders_are_listed_and_found(self):
        here = self.open_trial("--jury", "3")
        os.makedirs("elsewhere")
        os.chdir("elsewhere")
        there = self.open_trial_in_place()
        os.chdir("..")
        trials = court.all_trials(".")
        self.assertEqual(len(trials), 2)
        by_run = {tr["run"]: tr for tr in trials}
        name = os.path.basename(there["dir"])
        self.assertFalse(by_run[name]["here"])
        self.assertFalse(by_run[name]["latest"])
        self.assertTrue(by_run[os.path.basename(here["dir"])]["here"])
        self.assertTrue(os.path.isfile(os.path.join(court.find_run(".", name), "state.json")))
        for bad in ("..", "../x", "a/b", "nope"):
            self.assertIsNone(court.find_run(".", bad), bad)

    def open_trial_in_place(self):
        time.sleep(1.1)  # run names have one-second resolution
        os.makedirs(".court")
        return court.open_trial("Open a second shop across town next spring", 3, 7)

    def test_a_session_run_trial_reports_its_time_from_the_files(self):
        state = self.open_trial("--jury", "3")
        self.assertIsNone(court.trial_data(state)["timing"])
        self.write_all(state, "opening", "1. point")
        self.assertGreaterEqual(court.trial_data(state)["timing"]["seconds"], 0)

    def test_replay_page_carries_the_command_that_opens_it_live(self):
        state = self.open_trial("--jury", "3")
        data = court.trial_data(state)
        self.assertIn("serve --run", data["serve_command"])
        self.assertIn(os.path.abspath(state["dir"]), data["serve_command"])

    def finished_trial(self):
        state = self.open_trial("--jury", "3")
        self.write_all(state, "opening", "1. 요점")
        self.write_all(state, "rebuttal", "1. 답")
        self.write_all(state, "jury", "VOTE: GUILTY\nREASON: 얇다\nDECIDING FACT: 저축\nWOULD FLIP IF: 더 팔면\n")
        self.write_all(state, "judge", "## 선고\n기다려")
        return state

    def translate_with(self, state, reply):
        def fake(claude, model, prompt, cwd, timeout=600, on_text=None, system=None, tools="", cancel=None):
            self.assertEqual((model, tools, system), (court.TRANSLATE_MODEL, "", court.TRANSLATE_SYSTEM))
            return {"text": reply(prompt), "seconds": 0.1, "first_text": 0.1, "input": 5, "cache_read": 0,
                    "cache_write": 0, "output": 5}
        real, court.claude_call = court.claude_call, fake
        try:
            court.translate_trial(state, "en", "claude")
        finally:
            court.claude_call = real
        return court.trial_data(state)["translations"]["en"]

    def test_translation_keeps_every_piece_and_the_original(self):
        state = self.finished_trial()
        jurors = json.dumps([{"reason": "thin", "fact": "savings", "flip": "sell more"}] * 3)
        tr = self.translate_with(state, lambda p: "noise " + jurors if "JSON array" in p else "EN:" + p[-5:])
        self.assertEqual(tr["status"], "done")
        self.assertEqual(sorted(tr["docs"]), sorted(["case", "judge", "jurors", "opening/prosecution", "opening/defense",
                                                     "rebuttal/prosecution", "rebuttal/defense"]))
        self.assertEqual(tr["docs"]["jurors"][0]["reason"], "thin")
        self.assertEqual(len(tr["costs"]), 7)
        self.assertIn("1. 요점", court.trial_data(state)["statements"][0]["text"])

    def test_translation_of_votes_that_comes_back_misshapen_is_dropped(self):
        state = self.finished_trial()
        tr = self.translate_with(state, lambda p: "not json" if "JSON array" in p else "EN")
        self.assertEqual(tr["status"], "done")
        self.assertNotIn("jurors", tr["docs"])

    def test_answer_language_follows_the_question(self):
        state = self.open_trial("--jury", "3")
        en = court.new_question(state, "judge", "why?", "en")
        self.assertIn("영어(English)로", court.ask_prompt(state, en))
        ko = court.new_question(state, "judge", "왜?")
        self.assertIn("한국어로", court.ask_prompt(state, ko))

    def test_run_names_from_the_page_cannot_leave_the_court_folder(self):
        state = self.open_trial("--jury", "3")
        name = os.path.basename(state["dir"])
        self.assertEqual(court.run_path(".", name), os.path.join(".", ".court", name))
        for bad in ("", "..", "../x", "a/b", "a\\b", "LATEST", "nope"):
            self.assertIsNone(court.run_path(".", bad), bad)

    def test_claude_call_sorts_out_limits_and_cancel(self):
        exe = self.fake_cli([{"type": "result", "is_error": True, "result": "You've hit your limit · resets 3pm"}])
        with self.assertRaises(court.RateLimited):
            court.claude_call(exe, None, "prompt", self.tmp)
        exe = self.fake_cli([{"type": "system"}])
        with self.assertRaises(RuntimeError) as e:
            court.claude_call(exe, None, "prompt", self.tmp)
        self.assertIn("doctor", str(e.exception))

    def test_claude_call_cancel_kills_the_call(self):
        import threading
        exe = self.fake_cli([{"type": "system"}], wait=20)
        cancel = threading.Event()
        threading.Timer(0.5, cancel.set).start()
        t0 = time.time()
        with self.assertRaises(court.Cancelled):
            court.claude_call(exe, None, "prompt", self.tmp, cancel=cancel)
        self.assertLess(time.time() - t0, 10)

    def fake_cli(self, lines, wait=0):
        """An executable that prints `lines` (stream-json events) the way `claude -p` does."""
        script = os.path.join(self.tmp, "fake_claude.py")
        with open(script, "w", encoding="utf-8") as f:
            f.write("import sys, time\nsys.stdin.read()\n")
            for line in lines:
                f.write("print(%r, flush=True)\n" % json.dumps(line))
            f.write("time.sleep(%d)\n" % wait)
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

    def test_claude_call_counts_what_a_web_search_spends_on_the_side(self):
        exe = self.fake_cli([{"type": "result", "is_error": False, "result": "ok", "usage": {"input_tokens": 10, "output_tokens": 2},
                              "modelUsage": {"a": {"inputTokens": 100, "outputTokens": 5}, "b": {"inputTokens": 50, "outputTokens": 1}}}])
        c = court.claude_call(exe, None, "prompt", self.tmp)
        self.assertEqual((c["input"], c["output"]), (150, 6))

    def test_claude_call_reports_an_error_result(self):
        exe = self.fake_cli([{"type": "result", "is_error": True, "result": "Not logged in · Please run /login"}])
        with self.assertRaises(RuntimeError) as e:
            court.claude_call(exe, None, "prompt", self.tmp)
        self.assertIn("claude auth login", str(e.exception))

if __name__ == "__main__":
    unittest.main()
