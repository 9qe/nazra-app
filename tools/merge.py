#!/usr/bin/env python3
"""Nazra — corpus merge. Reads all sources, dedupes, writes preview/data/radars.json.

Merge order (later sources win on conflicting mergeable fields):
  1. tools/out/corpus.json    — OSM Overpass (public, refreshable, free)
  2. tools/out/gam_amman.json — GAM / Central Traffic press-verified lists (approx-geo)
  3. tools/out/overrides.json — manual corrections (optional file, highest trust)

Precedence rules (mirrored in meta.note):
  - Speed-limit conflicts: GAM/overrides win over OSM.
  - A GAM entry within 40 m (haversine) of an existing OSM entry merges ONTO it:
    GAM wins name/nameEn/limit/operator/verified; the OSM base keeps id/type/geo.
    Overrides merge onto any existing entry and may also change type/geo. Entries
    from the same source are kept apart when ids differ (direction-pair cameras).
  - verified is only ever the entry's own flag; a merge never manufactures verified:true.

Robustness contract:
  - Coordinates must be finite numbers in range (lat [-90,90], lng [-180,180]);
    invalid entries are skipped and counted, never guessed, never crash.
  - Each source accepts a parsed list/dict payload or a file path; overrides.json
    accepts a top-level list, a dict with "entries", may be missing or malformed.
  - Unknown types fall back to "fixed" and are logged to stderr once per distinct value.
  - Duplicate ids inside one source collapse last-write-wins and are logged.
  - Output is deterministic (sorted keys, sorted arrays): byte-identical across runs
    within the same session except the date stamp.

Usage:
  python tools/merge.py    # from any cwd; all paths are anchored to this file

Outputs:
  preview/data/radars.json     — final corpus the PWA ships with
  tools/out/merge_report.json  — per-source counters + merge stats
"""

from __future__ import annotations

import datetime
import hashlib
import json
import math
import sys
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
ROOT = TOOLS_DIR.parent
OUT = TOOLS_DIR / "out"
PREVIEW_DATA = ROOT / "preview" / "data"
CORPUS_PATH = OUT / "corpus.json"
GAM_PATH = OUT / "gam_amman.json"
OVERRIDES_PATH = OUT / "overrides.json"

SOURCE_OSM = "OSM Overpass"
SOURCE_GAM = "GAM/Central Traffic press-verified"
SOURCE_MANUAL = "manual estimate"

# Camera corpus types (CameraType in app/src/types/radar.ts + police/checkpoint from the OSM schema)
ALL_TYPES = ("avg", "bump", "checkpoint", "fixed", "light", "locality", "police")
CAMERA_TYPES = tuple(t for t in ALL_TYPES if t != "avg")

DEDUPE_RADIUS_KM = 0.04  # 40 m — GAM press-geo tolerance per spec

# Fields the base entry keeps on a later-source merge (identity, geometry, own provenance).
BASE_KEEPS = frozenset({"id", "type", "geo", "corridor", "lenM", "source"})
OVERRIDE_KEEPS = frozenset({"id", "source"})  # manual overrides may also change type/geo

NOTE = (
    "OSM = refreshable public data. GAM/Central Traffic press-verified = approximate geo "
    "until field-verified. Manual overrides = highest trust. Merge precedence: on conflicts "
    "(speed limits included) GAM/overrides win name/limit/operator/verified over OSM; a GAM entry "
    "within 40 m of an existing OSM entry merges onto it keeping the OSM id/type/geo and gaining "
    "a sources array. verified is each entry's own flag and is never boosted by merging. "
    "Do not hot-edit radars.json manually; edit tools/out/gam_amman.json or overrides.json "
    "and re-run merge.py."
)


def warn(msg):
    print(f"merge.py: {msg}", file=sys.stderr)


def _as_number(v):
    """int/float (finite, non-bool) or numeric string -> int|float; anything else -> None."""
    if isinstance(v, bool):
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return v if math.isfinite(v) else None
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return None
        try:
            f = float(s)
        except ValueError:
            return None
        if not math.isfinite(f):
            return None
        return int(f) if f.is_integer() else f
    return None


def _truthy(v):
    """Honest bool parse: strings never pass as truthy implicitly; unknown -> False."""
    if isinstance(v, bool):
        return v
    if isinstance(v, int) and v in (0, 1):
        return v == 1
    if isinstance(v, str):
        return v.strip().lower() in ("true", "yes", "1")
    return False


def _valid_coord(v, lo, hi):
    n = _as_number(v)
    return n is not None and lo <= n <= hi


def _valid_point(p):
    """Strict [lat, lng] pair with ranges checked; NaN/Inf fail via isfinite."""
    if not isinstance(p, (list, tuple)) or len(p) != 2:
        return False
    return _valid_coord(p[0], -90, 90) and _valid_coord(p[1], -180, 180)


def _point(p):
    return [float(_as_number(p[0])), float(_as_number(p[1]))]


def hav_km(a, b):
    R = math.pi / 180
    d_lat = (b[0] - a[0]) * R
    d_lng = (b[1] - a[1]) * R
    s = (
        math.sin(d_lat / 2) ** 2
        + math.cos(a[0] * R) * math.cos(b[0] * R) * math.sin(d_lng / 2) ** 2
    )
    return 6371 * 2 * math.atan2(math.sqrt(s), math.sqrt(1 - s))


def _text(o, key, fallback=None):
    v = o.get(key)
    if not v and fallback is not None:
        v = o.get(fallback)
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v)
    return ""


def _limit(o):
    v = _as_number(o.get("limit"))
    if v is None:
        v = _as_number(o.get("maxspeed"))
    return v


class _Stats:
    """Per-run counters; slots keyed by provenance label."""

    def __init__(self):
        self.per_source = {}
        self.unknown_types = {}
        self.limit_conflicts = 0
        self.merge_total = 0
        self._unknown_warned = set()

    def slot(self, label):
        if label not in self.per_source:
            self.per_source[label] = {
                "entries": 0, "kept": 0, "added": 0, "merged": 0, "duplicates": 0,
                "skipped": {"non_dict": 0, "no_geo": 0, "bad_geo": 0, "bad_corridor": 0, "orphan": 0},
            }
        return self.per_source[label]

    def unknown_type(self, val):
        self.unknown_types[val] = self.unknown_types.get(val, 0) + 1
        if val not in self._unknown_warned:
            self._unknown_warned.add(val)
            warn(f'unknown entry type "{val}" -> fixed (logged once per distinct value)')


def norm(o, src, st, today):
    """Wrap a raw source entry into the unified canon; returns (canon, reason)."""
    if not isinstance(o, dict):
        return None, "non_dict"

    raw_type = o.get("type")
    if raw_type is None or (isinstance(raw_type, str) and not raw_type.strip()):
        t = "fixed"
    elif isinstance(raw_type, str) and raw_type.strip() in ALL_TYPES:
        t = raw_type.strip()
    else:
        st.unknown_type(raw_type if isinstance(raw_type, str) else str(raw_type))
        t = "fixed"

    cor = o.get("corridor")
    corridor_ok = isinstance(cor, dict) and _valid_point(cor.get("enter")) and _valid_point(cor.get("exit"))
    if t == "avg" and isinstance(cor, dict) and not corridor_ok:
        return None, "bad_corridor"

    raw_id = o.get("id")
    if isinstance(raw_id, str) and raw_id.strip():
        eid = raw_id.strip()
    elif isinstance(raw_id, (int, float)) and not isinstance(raw_id, bool):
        eid = str(raw_id)
    else:
        eid = None

    geo = o.get("geo")
    if not _valid_point(geo):
        geo = None
    if geo is None:
        lat = _as_number(o.get("lat"))
        lng = _as_number(o.get("lng"))
        if lat is not None and lng is not None and -90 <= lat <= 90 and -180 <= lng <= 180:
            geo = [lat, lng]
    if geo is None and t == "avg" and isinstance(cor, dict) and corridor_ok:
        geo = _point(cor["enter"])
    if geo is None:
        has_pos = any(k in o for k in ("geo", "lat", "lng"))
        if has_pos:
            return None, "bad_geo"          # coordinates present but invalid — skipped, never guessed
        if eid is None:
            return None, "no_geo"           # nothing locatable at all
        # explicit id with no coordinate fields: geo-less pending correction, merges by id only

    if eid is None:
        eid = f"{src[:3].upper()}-{hashlib.sha1(str(geo).encode()).hexdigest()[:8]}"

    added = o.get("added")
    out = {
        "id": eid,
        "type": t,
        "name": _text(o, "name"),
        "nameEn": _text(o, "nameEn", "name"),
        "geo": geo,
        "limit": _limit(o),
        "operator": _text(o, "operator") or "public",
        "verified": _truthy(o.get("verified", False)),
        "source": src,
        "added": added.strip() if isinstance(added, str) and added.strip() else today,
        "notes": _text(o, "notes"),
    }
    if t == "avg" and isinstance(cor, dict) and corridor_ok:
        out["corridor"] = {"enter": _point(cor["enter"]), "exit": _point(cor["exit"])}
        raw_len = _as_number(o.get("lenM"))
        out["lenM"] = raw_len if raw_len is not None and raw_len > 0 else 800
    ev = o.get("evidence")
    if isinstance(ev, dict) and ev:
        out["evidence"] = ev
    conf = _as_number(o.get("confidence"))
    if conf is not None:
        out["confidence"] = float(conf)
    return out, None


def _read_file(path):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig")), None
    except (OSError, ValueError) as e:
        return None, f"un-parsable file {path.name}: {e}"


def _read_payload(spec, label, st, optional):
    """spec: Path | existing-file str | parsed list/dict/scalar | None. Returns raw entry list."""
    if spec is None:
        if not optional:
            warn(f"{label}: missing source — treated as empty")
        return []
    data = spec
    if isinstance(spec, Path) or (isinstance(spec, str) and Path(spec).exists()):
        p = Path(spec)
        if not p.exists():
            if not optional:
                warn(f"{label}: missing file — treated as empty")
            return []
        data, err = _read_file(p)
        if err:
            warn(f"{label}: {err}")
            return []
    if isinstance(data, dict):
        entries = data.get("entries")
        if not isinstance(entries, list):
            warn(f'{label}: no "entries" array — treated as empty')
            return []
        return entries
    if isinstance(data, list):
        return data
    warn(f"{label}: payload is {type(data).__name__}, expected list or dict — skipped")
    return []


def _dedupe_by_id(entries, label, st):
    """Collapse duplicate explicit ids within one source (last write wins)."""
    out, seen, dupes = [], {}, 0
    for o in entries:
        if isinstance(o, dict):
            raw = o.get("id")
            key = raw.strip() if isinstance(raw, str) and raw.strip() else (
                str(raw) if isinstance(raw, (int, float)) and not isinstance(raw, bool) else None)
            if key is not None and key in seen:
                dupes += 1
                out[seen[key]] = o
                continue
            if key is not None:
                seen[key] = len(out)
        out.append(o)
    if dupes:
        st.slot(label)["duplicates"] += dupes
        warn(f"{label}: {dupes} duplicate id(s) collapsed, last write wins")
    return out


def _normalize(entries, src, st, today):
    slot = st.slot(src)
    canon = []
    for o in entries:
        slot["entries"] += 1
        n, reason = norm(o, src, st, today)
        if n is None:
            slot["skipped"][reason] += 1
            continue
        slot["kept"] += 1
        canon.append(n)
    return canon


def _find_proximate(merged, geo, base_label):
    """First existing entry within 40 m; base_label None = scan every base, elif source filter."""
    for entry in merged.values():
        if base_label is not None and entry["source"] != base_label:
            continue
        g = entry.get("geo")
        if g and hav_km(g, geo) < DEDUPE_RADIUS_KM:
            return entry
    return None


def _merge_onto(base, cand, protected, st):
    """Field-level merge: skip only None and "" — False/0 are real values and win."""
    for key, val in cand.items():
        if key in protected or key == "sources":
            continue
        if val is None or (isinstance(val, str) and val.strip() == ""):
            continue
        if key == "limit" and base.get("limit") is not None and base["limit"] != val:
            st.limit_conflicts += 1
        base[key] = val
    labels = {base["source"], cand["source"]} | set(base.get("sources") or ())
    base["sources"] = sorted(labels)
    st.merge_total += 1


def _sort_key(e, default_conf):
    c = e.get("confidence")
    if not isinstance(c, (int, float)) or isinstance(c, bool):
        c = default_conf
    return (-float(c), e["id"])


def _scrub(v):
    """Replace non-finite floats with None so allow_nan=False can never fire."""
    if isinstance(v, float):
        return v if math.isfinite(v) else None
    if isinstance(v, dict):
        return {k: _scrub(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_scrub(x) for x in v]
    return v


def run_merge(out_dir, preview_dir, sources, today=None):
    """Merge sources (paths or pre-parsed payloads) -> radars.json + merge_report.json.

    sources: {"osm": <corpus>, "gam": <gam data>, "overrides": <optional>}; each value
    is a file path (Path/existing str) or an already-parsed list/dict; None = missing.
    Returns {"radars": payload_dict, "report": report_dict}.
    """
    st = _Stats()
    today = today if today is not None else datetime.date.today().isoformat()
    sources = sources or {}
    merged = {}

    osm_raw = _read_payload(sources.get("osm"), "osm (corpus.json)", st, optional=False)
    gam_raw = _read_payload(sources.get("gam"), "gam (gam_amman.json)", st, optional=False)
    ovr_raw = _read_payload(sources.get("overrides"), "overrides.json", st, optional=True)

    pipeline = (
        (SOURCE_OSM, osm_raw, BASE_KEEPS, None),          # OSM never pulls in by proximity — importer already deduped at 15 m; direction-pair cams sit 15-40 m apart on purpose
        (SOURCE_GAM, gam_raw, BASE_KEEPS, SOURCE_OSM),    # GAM merges onto existing OSM entries within 40 m
        (SOURCE_MANUAL, ovr_raw, OVERRIDE_KEEPS, "*"),    # overrides may merge onto any existing entry
    )

    for src, entries, protected, scan_bases in pipeline:
        entries = _dedupe_by_id(entries, src, st)
        for cand in _normalize(entries, src, st, today):
            target = merged.get(cand["id"])
            if target is None and cand.get("geo") and scan_bases is not None:
                target = _find_proximate(merged, cand["geo"],
                                         None if scan_bases == "*" else scan_bases)
            if target is None:
                if not cand.get("geo"):
                    st.slot(src)["skipped"]["orphan"] += 1
                    warn(f'{src}: geo-less correction {cand["id"]!r} matched no entry — dropped')
                    continue
                merged[cand["id"]] = cand
                st.slot(src)["added"] += 1
            else:
                _merge_onto(target, cand, protected, st)
                st.slot(src)["merged"] += 1

    zones = sorted((e for e in merged.values() if e["type"] == "avg"),
                   key=lambda e: _sort_key(e, 0.7))
    cams = sorted((e for e in merged.values() if e["type"] != "avg"),
                  key=lambda e: _sort_key(e, 0.6))

    source_set = set()
    for e in list(zones) + list(cams):
        source_set.add(e["source"])
        source_set.update(e.get("sources") or ())

    by_type = {t: sum(1 for c in cams if c["type"] == t) for t in CAMERA_TYPES}
    meta = {
        "generated": today,
        "counts": {"zones": len(zones), "cameras": len(cams), "by_type": by_type},
        "sources": sorted(source_set),
        "verified_count": sum(1 for e in cams + zones if e.get("verified") is True),
        "note": NOTE,
    }
    payload = _scrub({"meta": meta, "zones": zones, "cameras": cams})

    report = {
        "generated": today,
        "counts": {"zones": len(zones), "cameras": len(cams), "by_type": dict(by_type)},
        "verified": meta["verified_count"],
        "zones": len(zones),  # legacy key
        "per_type": {t: by_type[t] for t in ("fixed", "light", "locality", "bump", "police")},  # legacy shape
        "sources": meta["sources"],
        "per_source": st.per_source,
        "merges": {"total": st.merge_total},
        "limit_conflicts": st.limit_conflicts,
        "unknown_types": dict(sorted(st.unknown_types.items())),
    }

    out_dir = Path(out_dir)
    preview_dir = Path(preview_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    (preview_dir / "radars.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8")
    (out_dir / "merge_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8")
    return {"radars": payload, "report": report}


def main():
    result = run_merge(OUT, PREVIEW_DATA, {
        "osm": CORPUS_PATH,
        "gam": GAM_PATH,
        "overrides": OVERRIDES_PATH,
    })
    meta = result["radars"]["meta"]
    print(f"wrote {PREVIEW_DATA / 'radars.json'} and {OUT / 'merge_report.json'}")
    print(
        f"merged -> {meta['counts']['zones']} zones + {meta['counts']['cameras']} cameras "
        f"| verified {meta['verified_count']} | sources: {', '.join(meta['sources'])}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
