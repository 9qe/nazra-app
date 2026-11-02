#!/usr/bin/env python3
"""Tests for tools/merge.py — stdlib unittest only (no pytest, no deps).

Runs three ways, all equivalent:
  python tools/tests/test_merge.py                     (direct)
  python -m unittest discover -s tools/tests -v        (repo root)
  python -m unittest tools.tests.test_merge -v         (repo root, package layout)
"""
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parents[1]
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))
import merge  # noqa: E402

DATE = "2026-01-01"


def osm_fixed(eid, lat, lng, limit=None, name="OSM cam", confidence=0.85):
    return {"id": eid, "type": "fixed", "lat": lat, "lng": lng, "limit": limit,
            "name": name, "operator": "public", "verified": False, "confidence": confidence}


def gam_fixed(eid, lat, lng, limit=None, name="GAM cam", operator="GAM", verified=False):
    return {"id": eid, "type": "fixed", "name": name, "geo": [lat, lng],
            "limit": limit, "operator": operator, "verified": verified}


def gam_avg(eid, enter, exit_, len_m=900, limit=60, name="مقطع"):
    return {"id": eid, "type": "avg", "name": name, "corridor": {"enter": enter, "exit": exit_},
            "lenM": len_m, "limit": limit, "operator": "GAM", "verified": False}


class MergeTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.base = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def run_merge(self, sources, sub=""):
        """run_merge inside the test temp dir; captures stderr."""
        out_dir = self.base / sub / "out"
        preview = self.base / sub / "preview"
        buf = io.StringIO()
        with redirect_stderr(buf):
            res = merge.run_merge(out_dir, preview, sources, today=DATE)
        res["stderr"] = buf.getvalue()
        return res

    def write(self, name, text):
        p = self.base / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
        return p

    # --- source shapes ---------------------------------------------------

    def test_gam_dict_and_list_shapes(self):
        entries = [gam_avg("Z-T1", [31.9, 35.9], [31.91, 35.91]),
                   gam_fixed("C-T1", 31.8, 35.8, 70)]
        by_dict = self.run_merge({"gam": {"entries": entries}})
        by_list = self.run_merge({"gam": entries})
        self.assertEqual(len(by_dict["radars"]["zones"]), 1)
        self.assertEqual(len(by_dict["radars"]["cameras"]), 1)
        self.assertEqual(by_list["radars"]["meta"]["counts"],
                         by_dict["radars"]["meta"]["counts"])

    def test_gam_avg_with_corridor_is_zone(self):
        res = self.run_merge({"gam": {"entries": [gam_avg("Z-T2", [31.9, 35.9], [31.91, 35.91])]}})
        r = res["radars"]
        self.assertEqual(r["cameras"], [])
        self.assertEqual(len(r["zones"]), 1)
        self.assertEqual(r["zones"][0]["id"], "Z-T2")
        self.assertEqual(r["zones"][0]["corridor"],
                         {"enter": [31.9, 35.9], "exit": [31.91, 35.91]})
        self.assertEqual(r["zones"][0]["lenM"], 900)

    def test_overrides_list_and_dict_shapes(self):
        osm = [osm_fixed("node/1", 31.0, 35.0, 90)]
        ovr = [{"id": "node/1", "verified": True}]
        for shape in (ovr, {"entries": ovr}):
            res = self.run_merge({"osm": osm, "overrides": shape})
            e = res["radars"]["cameras"][0]
            self.assertTrue(e["verified"])
            self.assertIn("manual estimate", e["sources"])

    def test_override_standalone_is_manual_estimate(self):
        res = self.run_merge({"overrides": [
            {"id": "OVR-1", "type": "fixed", "geo": [30.0, 36.0], "verified": True}]})
        e = res["radars"]["cameras"][0]
        self.assertEqual(e["source"], "manual estimate")
        self.assertTrue(e["verified"])

    def test_overrides_missing_file_is_fine(self):
        res = self.run_merge({"osm": [osm_fixed("node/1", 31.0, 35.0, 90)], "gam": []})
        self.assertFalse(res["radars"]["cameras"][0]["verified"])
        self.assertEqual(res["stderr"], "")

    def test_geoless_orphan_correction_dropped(self):
        res = self.run_merge({"osm": [], "overrides": [{"id": "ghost", "verified": True}]})
        self.assertEqual(res["radars"]["cameras"], [])
        self.assertEqual(res["report"]["per_source"]["manual estimate"]["skipped"]["orphan"], 1)
        self.assertIn("dropped", res["stderr"])

    def test_geoless_id_correction_patches_entry(self):
        osm = [osm_fixed("node/4", 31.0, 35.0, 90)]
        res = self.run_merge({"osm": osm, "overrides": [
            {"id": "node/4", "verified": True, "limit": 100, "notes": "manual check"}]})
        e = res["radars"]["cameras"][0]
        self.assertTrue(e["verified"])
        self.assertEqual(e["limit"], 100)
        self.assertEqual(e["notes"], "manual check")
        self.assertEqual(e["geo"], [31.0, 35.0])
        self.assertEqual(e["sources"], ["OSM Overpass", "manual estimate"])
        self.assertEqual(res["report"]["per_source"]["manual estimate"]["merged"], 1)

    def test_overrides_malformed_file_logged_skipped(self):
        bad = self.write("overrides.json", '{"entries": [')
        res = self.run_merge({"osm": [osm_fixed("node/1", 31.0, 35.0, 90)], "overrides": bad})
        self.assertFalse(res["radars"]["cameras"][0]["verified"])
        self.assertIn("un-parsable", res["stderr"])

    # --- malformed / invalid input ----------------------------------------

    def test_malformed_osm_payloads_no_crash(self):
        for bad in ("hello", 5, 3.14, True):
            res = self.run_merge({"osm": bad, "gam": [], "overrides": None})
            self.assertEqual(res["radars"]["zones"], [])
            self.assertEqual(res["radars"]["cameras"], [])
            self.assertIn("skipped", res["stderr"])

    def test_malformed_osm_files_no_crash(self):
        for text, marker in (("not json at all", "un-parsable"),
                             ('"just a string"', "skipped"),
                             ("7", "skipped"),
                             ("", "un-parsable")):
            f = self.write("osm_bad.json", text)
            res = self.run_merge({"osm": f, "gam": [], "overrides": None})
            self.assertEqual(res["radars"]["cameras"], [])
            self.assertIn(marker, res["stderr"])

    def test_invalid_coordinates_skipped(self):
        osm = [
            osm_fixed("n1", 999.0, 35.0),
            osm_fixed("n2", float("nan"), 35.0),
            {"id": "n3", "type": "fixed", "geo": ["x", "y"]},
            gam_avg("n4", [31.9, 35.9], [95.0, 700.0]),
            osm_fixed("ok", 31.5, 35.5, 60),
        ]
        res = self.run_merge({"osm": osm})
        self.assertEqual([c["id"] for c in res["radars"]["cameras"]], ["ok"])
        skipped = res["report"]["per_source"]["OSM Overpass"]["skipped"]
        self.assertEqual(skipped["bad_geo"], 3)
        self.assertEqual(skipped["bad_corridor"], 1)

    def test_gam_bad_corridor_zone_skipped(self):
        res = self.run_merge({"gam": {"entries": [gam_avg("Z-BAD", [95.0, 700.0], [31.91, 35.91])]}})
        self.assertEqual(res["radars"]["zones"], [])
        self.assertEqual(res["report"]["per_source"]["GAM/Central Traffic press-verified"]["skipped"]["bad_corridor"], 1)

    # --- dedupe / precedence ------------------------------------------------

    def test_dedupe_40m_gam_onto_osm(self):
        osm = [osm_fixed("node/1", 31.9700, 35.9200, 80, name="OSM Thing")]
        gam = {"entries": [gam_fixed("C-T9", 31.9702, 35.9201, 70, name="GAM Thing")]}
        res = self.run_merge({"osm": osm, "gam": gam})
        self.assertEqual(res["radars"]["meta"]["counts"]["cameras"], 1)
        e = res["radars"]["cameras"][0]
        self.assertEqual(e["id"], "node/1")          # base keeps identity
        self.assertEqual(e["name"], "GAM Thing")     # GAM wins name
        self.assertEqual(e["limit"], 70)             # GAM wins limit
        self.assertEqual(e["operator"], "GAM")       # GAM wins operator
        self.assertEqual(e["type"], "fixed")
        self.assertEqual(e["geo"], [31.9700, 35.9200])
        self.assertFalse(e["verified"])
        self.assertEqual(e["sources"],
                         ["GAM/Central Traffic press-verified", "OSM Overpass"])
        self.assertEqual(res["report"]["per_source"]["GAM/Central Traffic press-verified"]["merged"], 1)

    def test_osm_steps_not_folded_by_proximity(self):
        # direction-pair cameras sit 15-40 m apart on purpose — never proximate-fold OSM
        osm = [osm_fixed("node/a", 31.9700, 35.9200, 90),
               osm_fixed("node/b", 31.9702, 35.9201, 90)]
        res = self.run_merge({"osm": osm})
        self.assertEqual(res["radars"]["meta"]["counts"]["cameras"], 2)

    def test_gam_gam_same_geo_not_folded(self):
        gam = {"entries": [gam_fixed("C-G1", 31.9702, 35.9201, 60),
                          gam_fixed("C-G2", 31.9703, 35.9202, 60)]}
        res = self.run_merge({"gam": gam})   # no OSM base — 40 m rule is GAM→OSM only
        self.assertEqual(res["radars"]["meta"]["counts"]["cameras"], 2)

    def test_override_merges_onto_any_base(self):
        res = self.run_merge({"gam": {"entries": [gam_fixed("K-M", 31.5, 35.5, None,
                                                         "press", verified=False)]},
                              "overrides": [{"id": "OVR-M", "geo": [31.5002, 35.5002],
                                             "verified": True}]})
        e = res["radars"]["cameras"][0]
        self.assertEqual(e["id"], "K-M")             # merged onto the GAM base
        self.assertEqual(e["sources"],
                         ["GAM/Central Traffic press-verified", "manual estimate"])
        self.assertTrue(e["verified"])
        self.assertEqual(res["radars"]["meta"]["counts"]["cameras"], 1)

    def test_verified_stays_false_on_unverified_merge(self):
        osm = [osm_fixed("node/2", 32.0, 35.0, 60)]
        gam = {"entries": [gam_fixed("C-TZ", 32.0001, 35.0001, 60)]}  # ~13 m apart
        res = self.run_merge({"osm": osm, "gam": gam})
        self.assertFalse(res["radars"]["cameras"][0]["verified"])
        self.assertEqual(res["report"]["per_source"]["GAM/Central Traffic press-verified"]["merged"], 1)

    def test_override_verifies_with_manual_estimate(self):
        res = self.run_merge({"osm": [osm_fixed("node/5", 31.0, 35.9, 60)],
                              "overrides": [{"id": "node/5", "verified": True}]})
        e = res["radars"]["cameras"][0]
        self.assertTrue(e["verified"])               # only when the entry itself carries it
        self.assertEqual(e["sources"], ["OSM Overpass", "manual estimate"])
        self.assertEqual(res["radars"]["meta"]["verified_count"], 1)

    def test_gam_verified_true_propagates_on_merge(self):
        osm = [osm_fixed("node/6", 31.0, 36.0, 60)]
        gam = {"entries": [gam_fixed("K-T3", 31.0001, 36.0001, None,
                                     "border", operator="Central Traffic", verified=True)]}
        res = self.run_merge({"osm": osm, "gam": gam})
        e = res["radars"]["cameras"][0]
        self.assertTrue(e["verified"])               # explicit verified:true evidence carried in
        self.assertEqual(res["radars"]["meta"]["verified_count"], 1)

    def test_empty_everything_is_valid_empty(self):
        res = self.run_merge({"osm": [], "gam": {"entries": []}, "overrides": None})
        r = res["radars"]
        self.assertEqual(r["zones"], [])
        self.assertEqual(r["cameras"], [])
        self.assertEqual(r["meta"]["counts"],
                         {"zones": 0, "cameras": 0,
                          "by_type": {t: 0 for t in merge.CAMERA_TYPES}})
        self.assertEqual(r["meta"]["sources"], [])
        self.assertEqual(r["meta"]["verified_count"], 0)
        self.assertTrue(r["meta"]["note"])

    def test_missing_files_treated_empty(self):
        res = self.run_merge({"osm": self.base / "nope1.json",
                              "gam": self.base / "nope2.json"})
        self.assertEqual(res["radars"]["cameras"], [])
        for src in ("OSM Overpass", "GAM/Central Traffic press-verified"):
            self.assertIn(src, res["report"]["per_source"])

    def test_conflicting_limits_gam_wins(self):
        near = osm_fixed("node/9", 31.9700, 35.9200, 90)
        far = osm_fixed("node/10", 32.3, 35.5, 90)
        gam = {"entries": [gam_fixed("C-C", 31.9702, 35.9201, 60)]}
        res = self.run_merge({"osm": [near, far], "gam": gam})
        cams = {c["id"]: c for c in res["radars"]["cameras"]}
        self.assertEqual(cams["node/9"]["limit"], 60)   # GAM wins on merged entry
        self.assertEqual(cams["node/10"]["limit"], 90)  # non-merged OSM keeps 90
        self.assertEqual(res["report"]["limit_conflicts"], 1)

    # --- determinism / bookkeeping -----------------------------------------

    def test_duplicate_ids_last_wins(self):
        osm = [osm_fixed("node/7", 31.1, 35.1, 50), osm_fixed("node/7", 31.2, 35.2, 70)]
        res = self.run_merge({"osm": osm})
        cams = res["radars"]["cameras"]
        self.assertEqual(len(cams), 1)
        self.assertEqual(cams[0]["limit"], 70)
        self.assertEqual(res["report"]["per_source"]["OSM Overpass"]["duplicates"], 1)
        self.assertIn("duplicate", res["stderr"])

    def test_unknown_type_fallback_logged_once(self):
        gam = {"entries": [
            {"id": "W1", "type": "magic", "geo": [31.0, 35.0]},
            {"id": "W2", "type": "magic", "geo": [31.1, 35.1]},
            {"id": "W3", "type": "mystery", "geo": [31.2, 35.2]}]}
        res = self.run_merge({"gam": gam})
        cams = res["radars"]["cameras"]
        self.assertEqual([c["type"] for c in cams], ["fixed", "fixed", "fixed"])
        self.assertEqual(res["stderr"].count('"magic"'), 1)   # once per distinct value
        self.assertEqual(res["report"]["unknown_types"], {"magic": 2, "mystery": 1})

    def test_determinism_byte_identical_runs(self):
        sources = {
            "osm": [osm_fixed("node/1", 31.97, 35.92, 90), osm_fixed("node/2", 32.0, 35.5, 70)],
            "gam": {"entries": [gam_avg("Z-D1", [31.8, 35.8], [31.81, 35.81]),
                                gam_fixed("C-D", 31.9777, 35.9, 60)]},
        }
        self.run_merge(sources, sub="run1")
        self.run_merge(sources, sub="run2")
        b1 = (self.base / "run1" / "preview" / "radars.json").read_bytes()
        b2 = (self.base / "run2" / "preview" / "radars.json").read_bytes()
        self.assertEqual(b1, b2)
        r1 = (self.base / "run1" / "out" / "merge_report.json").read_bytes()
        r2 = (self.base / "run2" / "out" / "merge_report.json").read_bytes()
        self.assertEqual(r1, r2)

    def test_maxspeed_fallback_and_numeric_strings(self):
        res = self.run_merge({"osm": [
            {"id": "m1", "type": "fixed", "lat": 31.0, "lng": 35.0, "maxspeed": "50"},
            {"id": "m2", "type": "fixed", "lat": 31.5, "lng": 35.5, "limit": "60"}]})
        limits = {c["id"]: c["limit"] for c in res["radars"]["cameras"]}
        self.assertEqual(limits, {"m1": 50, "m2": 60})

    def test_works_from_other_cwd(self):
        fake = self.base / "fakecwd"
        fake.mkdir()
        cwd0 = os.getcwd()
        try:
            os.chdir(str(fake))
            res = self.run_merge({"gam": {"entries": [gam_fixed("C-X", 31.0, 35.0, 60)]}})
        finally:
            os.chdir(cwd0)
        self.assertEqual(len(res["radars"]["cameras"]), 1)

    def test_report_shape_and_counts_mirror(self):
        res = self.run_merge({"osm": [osm_fixed("node/1", 31.0, 35.0, 90)],
                              "gam": {"entries": [gam_fixed("C-R", 31.8, 35.8, 70)]}})
        rep = res["report"]
        for key in ("generated", "counts", "verified", "per_type", "zones",
                    "sources", "per_source", "merges", "limit_conflicts", "unknown_types"):
            self.assertIn(key, rep)
        self.assertEqual(set(rep["per_source"]),
                         {"OSM Overpass", "GAM/Central Traffic press-verified", "manual estimate"})
        self.assertEqual(rep["counts"]["cameras"], res["radars"]["meta"]["counts"]["cameras"])
        self.assertTrue((self.base / "out" / "merge_report.json").exists())
        on_disk = json.loads((self.base / "preview" / "radars.json").read_text(encoding="utf-8"))
        self.assertEqual(len(on_disk["cameras"]), 2)


if __name__ == "__main__":
    unittest.main()


