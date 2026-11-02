#!/usr/bin/env python3
"""import_osm.py - build the refreshable Jordan traffic-camera corpus from OpenStreetMap.

Stdlib only (urllib, json, math). Windows-safe: pathlib anchoring (runs from any CWD),
UTF-8 output files, no shell deps.

Outputs (anchored to this file's location):
    tools/out/osm_raw.json    whole raw Overpass export + fetch meta
    tools/out/corpus.json     normalized, sorted, deduped entries

Run:
    python tools/import_osm.py
"""

from __future__ import annotations

import json
import math
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

# Jordan's real extent, Overpass bbox order: (south, west, north, east)
BBOX_S, BBOX_W, BBOX_N, BBOX_E = 29.18, 34.9, 32.65, 39.3
BBOX = f"({BBOX_S},{BBOX_W},{BBOX_N},{BBOX_E})"

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

QUERY = f"""[out:json][timeout:120];
(
  node["highway"="speed_camera"]{BBOX};
  relation["type"="enforcement"]{BBOX};
  relation["enforcement"]{BBOX};
  node["highway"="traffic_signals"]["traffic_signals:shape"="camera"]{BBOX};
  node["highway"="traffic_signals"]["surveillance"="camera"]{BBOX};
  node["highway"="traffic_signals"]["surveillance:type"="camera"]{BBOX};
  node["highway"="traffic_signals"]["camera:mount"]{BBOX};
  node["highway"="traffic_signals"]["enforcement"]{BBOX};
  way["maxspeed"]["enforcement"]{BBOX};
);
out body center qt;
"""

SELECTORS = [
    'node["highway"="speed_camera"]',
    'relation["type"="enforcement"]',
    'relation["enforcement"]',
    'node["highway"="traffic_signals"]["traffic_signals:shape"="camera"]',
    'node["highway"="traffic_signals"]["surveillance"="camera"]',
    'node["highway"="traffic_signals"]["surveillance:type"="camera"]',
    'node["highway"="traffic_signals"]["camera:mount"]',
    'node["highway"="traffic_signals"]["enforcement"]',
    'way["maxspeed"]["enforcement"]',
]

OUT_DIR = Path(__file__).resolve().parent.parent / "out"
RAW_OUT = OUT_DIR / "osm_raw.json"
CORPUS_OUT = OUT_DIR / "corpus.json"

# enforcement value -> corpus category
ENFORCEMENT_CATEGORY = {
    "maxspeed": "fixed",
    "average_speed": "avg",
    "section_control": "avg",
    "traffic_signals": "light",
    "red_turn": "light",
    "police": "police",
    "check": "checkpoint",
}
# camera:type value -> corpus category
CAMERA_TYPE_CATEGORY = {
    "fixed": "fixed",
    "mobile": "fixed",
    "section": "avg",
    "section_control": "avg",
}
CATEGORY_ORDER = ["fixed", "avg", "light", "police", "checkpoint", "bump"]

# camera-ish keys that make a traffic_signals node eligible
SIGNAL_KEYS = (
    "traffic_signals:shape",
    "surveillance",
    "surveillance:type",
    "camera:mount",
    "camera:type",
)

# raw tags kept on the trimmed export, most useful first
RAW_TAG_PRIORITY = [
    "enforcement", "highway", "maxspeed", "type",
    "traffic_signals:shape", "surveillance", "surveillance:type",
    "camera:mount", "camera:type", "camera:maxspeed", "camera:direction",
    "operator", "name", "name:en", "direction", "ref",
]

NOTES = (
    "OSM traffic-camera coverage in Jordan is sparse and community-driven: many real "
    "installations are untagged, and mapped ones are often unnamed or unmaintained. "
    "Treat this corpus as a floor, not ground truth - keep verified:false, refresh by "
    "re-running tools/src/import_osm.py, and cross-check new mappings in OSM. "
    "The checkpoint/bump categories come from other sources; this importer does not query them."
)


def fetch_overpass(query):
    """POST the query to the first reachable Overpass endpoint. Returns (data, endpoint)."""
    payload = urllib.parse.urlencode({"data": query}).encode("utf-8")
    last_error = None
    for url in ENDPOINTS:
        for attempt in (1, 2):
            try:
                req = urllib.request.Request(
                    url,
                    data=payload,
                    headers={
                        "User-Agent": "radarbot-jordan-osm-import/1.0 (stdlib urllib; OSM corpus refresh)"
                    },
                )
                with urllib.request.urlopen(req, timeout=180) as resp:
                    return json.loads(resp.read().decode("utf-8")), url
            except Exception as exc:  # network layer: retry, then fail over
                last_error = f"{url} (attempt {attempt}): {exc}"
                time.sleep(2 * attempt)
    raise SystemExit(f"all Overpass endpoints failed; last error: {last_error}")


def category_of(tags, osm_type):
    """Corpus category for an element, or None when it is not camera material."""
    enforcement = tags.get("enforcement")
    if tags.get("highway") == "speed_camera":
        if enforcement in ENFORCEMENT_CATEGORY:
            return ENFORCEMENT_CATEGORY[enforcement]
        return CAMERA_TYPE_CATEGORY.get(tags.get("camera:type", ""), "fixed")
    if tags.get("highway") == "traffic_signals":
        if enforcement in ENFORCEMENT_CATEGORY:
            return ENFORCEMENT_CATEGORY[enforcement]
        if any(key in tags for key in SIGNAL_KEYS):
            return "light"
        return None
    # ways and relations only qualify when they carry an enforcement tag
    if not enforcement:
        return None
    return ENFORCEMENT_CATEGORY.get(enforcement, "fixed")


def confidence_of(tags):
    if "maxspeed" in tags and "enforcement" in tags:
        return 1.0
    if tags.get("highway") == "speed_camera":
        return 0.85
    if tags.get("highway") == "traffic_signals" and any(k in tags for k in SIGNAL_KEYS):
        return 0.7
    return 0.65


def parse_maxspeed(raw):
    """'60' / '60 knots' / 'AT:urban' -> 60 when a leading number exists, else None."""
    if not raw:
        return None
    digits = ""
    for ch in str(raw).strip():
        if ch.isdigit():
            digits += ch
        elif digits:
            break
    return int(digits) if digits else None


def trim_tags(tags, limit=12):
    present = set(tags)
    ordered = [k for k in RAW_TAG_PRIORITY if k in present]
    ordered += sorted(present.difference(RAW_TAG_PRIORITY))
    return {k: tags[k] for k in ordered[:limit]}


def normalize(element, iso_date):
    """OSM element -> corpus entry, or None when unusable (no position / no camera tags)."""
    osm_type = element.get("type")
    tags = element.get("tags") or {}
    if osm_type == "node":
        lat, lng = element.get("lat"), element.get("lon")
    else:
        center = element.get("center") or {}
        lat, lng = center.get("lat"), center.get("lon")
    if lat is None or lng is None:
        return None  # fail closed: no resolvable position
    category = category_of(tags, osm_type)
    if category is None:
        return None
    return {
        "id": f"{osm_type}/{element['id']}",
        "type": category,
        "osmType": osm_type,
        "osmId": element["id"],
        "name": tags.get("name"),
        "nameEn": tags.get("name:en"),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "operator": tags.get("operator"),
        "maxspeed": parse_maxspeed(tags.get("maxspeed")),
        "direction": tags.get("camera:direction") or tags.get("direction"),
        "verified": False,
        "source": f"OSM Overpass {iso_date}",
        "confidence": confidence_of(tags),
        "evidence": {
            "camera:type": tags.get("camera:type"),
            "camera:maxspeed": tags.get("camera:maxspeed"),
            "camera:direction": tags.get("camera:direction"),
            "enforcement": tags.get("enforcement"),
            "surveillance:type": tags.get("surveillance:type"),
            "highway:speed_camera": tags.get("highway") == "speed_camera",
            "traffic_signals": tags.get("highway") == "traffic_signals",
        },
        "rawTags": trim_tags(tags),
    }


def distance_m(lat1, lng1, lat2, lng2):
    radius = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def dedupe(entries, radius_m=15.0):
    """Drop entries within radius_m of an already-kept one. Corpus is small; O(n^2) is fine."""
    kept = []
    for entry in entries:  # caller passes confidence-sorted, so the best record wins each cluster
        if all(distance_m(entry["lat"], entry["lng"], k["lat"], k["lng"]) > radius_m for k in kept):
            kept.append(entry)
    return kept


def dump(path, doc):
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    now = datetime.now(timezone.utc)
    iso_date = now.strftime("%Y-%m-%d")
    fetched_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    data, endpoint = fetch_overpass(QUERY)
    elements = data.get("elements", [])
    raw_type_counts = Counter(el.get("type") for el in elements)

    entries, skipped = [], 0
    for element in elements:
        entry = normalize(element, iso_date)
        if entry is None:
            skipped += 1
        else:
            entries.append(entry)

    entries.sort(key=lambda e: (-e["confidence"], e["id"]))
    entries = dedupe(entries)
    entries.sort(key=lambda e: (CATEGORY_ORDER.index(e["type"]), e["lat"], e["lng"]))
    counts = Counter(e["type"] for e in entries)

    meta_common = {
        "date": iso_date,
        "fetchedAt": fetched_at,
        "endpoint": endpoint,
        "bbox": {"south": BBOX_S, "west": BBOX_W, "north": BBOX_N, "east": BBOX_E},
        "selectors": SELECTORS,
        "notes": NOTES,
    }
    raw_doc = {
        "meta": {
            **meta_common,
            "elementCount": len(elements),
            "countsByOsmType": {k: raw_type_counts.get(k, 0) for k in ("node", "way", "relation")},
        },
        "elements": elements,
    }
    corpus = {
        "meta": {
            **meta_common,
            "entryCount": len(entries),
            "counts": {cat: counts.get(cat, 0) for cat in CATEGORY_ORDER},
            "skipped": skipped,
            "dedupeRadiusMeters": 15,
        },
        "entries": entries,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dump(RAW_OUT, raw_doc)
    dump(CORPUS_OUT, corpus)

    print(f"endpoint      : {endpoint}")
    print(
        f"raw elements  : {len(elements)} "
        f"(nodes={raw_type_counts.get('node', 0)}, ways={raw_type_counts.get('way', 0)}, "
        f"relations={raw_type_counts.get('relation', 0)})"
    )
    print(
        f"corpus entries: {len(entries)} -> "
        + ", ".join(f"{cat}={counts.get(cat, 0)}" for cat in CATEGORY_ORDER)
        + f" (skipped={skipped})"
    )
    print(f"wrote {RAW_OUT}")
    print(f"wrote {CORPUS_OUT}")


if __name__ == "__main__":
    main()
