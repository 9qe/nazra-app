#!/usr/bin/env python3
"""Nazra — corpus merge. Reads all sources under tools/out/, dedupes, writes preview/data/radars.json.

Sources (in merge order — later sources win on exact-geo conflicts):
  1. osm_raw.json / corpus.json — OSM Overpass (public, refreshable, free)
  2. gam_amman.json — GAM / Central Traffic press-verified lists (approx-geo, field-verify flags)
  3. overrides.json — manual corrections (verified:true + notes)

Usage:
  python tools/merge.py

Output:
  preview/data/radars.json — final corpus the PWA ships with
  tools/out/merge_report.json — counts per source, per type
"""
from __future__ import annotations
import json, hashlib, math, os, sys, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "out"
PREVIEW_DATA = ROOT / "preview" / "data"

def load(name):
    p = OUT / name
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"! {name} un-parsable: {e}", file=sys.stderr)
        return None

def hav_km(a, b):
    R = math.pi / 180
    dLat = (b[0] - a[0]) * R; dLng = (b[1] - a[1]) * R
    s = math.sin(dLat / 2) ** 2 + math.cos(a[0] * R) * math.cos(b[0] * R) * math.sin(dLng / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(s), math.sqrt(1 - s))

def norm(o, src):
    """wrap a source entry into unified form"""
    t = o.get("type", "fixed")
    if t not in ("avg", "fixed", "light", "locality", "bump", "police"):
        t = "fixed"
    geo = o.get("geo")
    if not geo:
        lat, lng = o.get("lat"), o.get("lng")
        if lat is not None and lng is not None:
            geo = [lat, lng]
    if not geo and t == "avg" and o.get("corridor"):
        geo = o["corridor"].get("enter")
    if not geo:
        return None
    out = {
        "id": o.get("id") or f"{src[:3].upper()}-{hashlib.sha1(str(geo).encode()).hexdigest()[:8]}",
        "type": t,
        "name": o.get("name") or "",
        "nameEn": o.get("nameEn") or o.get("name") or "",
        "geo": geo,
        "limit": o.get("limit"),
        "operator": o.get("operator") or "public",
        "verified": bool(o.get("verified", False)),
        "source": src,
        "added": o.get("added") or datetime.date.today().isoformat(),
        "notes": o.get("notes", ""),
    }
    if t == "avg" and o.get("corridor"):
        out["corridor"] = o["corridor"]
        out["lenM"] = o.get("lenM") or 800
    if o.get("evidence"):
        out["evidence"] = o["evidence"]
    if o.get("confidence"):
        out["confidence"] = float(o["confidence"])
    return out

def main():
    merged = {}

    # 1. OSM
    osm = load("corpus.json")
    if osm and isinstance(osm, dict):
        for o in (osm.get("entries") or osm.get("results") or []):
            if isinstance(o, dict):
                n = norm(o, "OSM Overpass")
                if n:
                    merged[n["id"]] = n
    elif isinstance(osm, list):
        for o in osm:
            if isinstance(o, dict):
                n = norm(o, "OSM Overpass")
                if n:
                    merged[n["id"]] = n

    # 2. GAM press-verified (approx-geo)
    gam = load("gam_amman.json")
    if gam and isinstance(gam, dict):
        for o in (gam.get("entries") or []):
            if isinstance(o, dict):
                n = norm(o, "GAM/Central Traffic press-verified")
            elif isinstance(o, list):
                continue
            else:
                continue
            if not n:
                continue
            # dedupe against existing OSM entries within 40m — GAM wins on name/limit
            dup = None
            for k, v in merged.items():
                if v.get("geo") and hav_km(v["geo"], n["geo"]) < 0.04:
                    dup = k; break
            if dup:
                merged[dup].update({k: v for k, v in n.items() if v not in (None, "", 0)})
            else:
                merged[n["id"]] = n

    # 3. manual overrides (highest trust)
    ov = load("overrides.json")
    if ov:
        for o in ov:
            n = norm(o, "manual override")
            if n:
                merged[n["id"]] = n

    # bucketize
    zones, cams = [], []
    for v in merged.values():
        if v["type"] == "avg":
            zones.append(v)
        else:
            cams.append(v)
    # sort by confidence where available
    cams.sort(key=lambda c: -c.get("confidence", 0.6))
    zones.sort(key=lambda z: -(z.get("confidence", 0.7)))

    meta = {
        "generated": datetime.date.today().isoformat(),
        "counts": {"zones": len(zones), "cameras": len(cams)},
        "sources": sorted({c["source"] for c in cams} | {z["source"] for z in zones}),
        "verified_count": sum(1 for c in cams + zones if c.get("verified")),
        "note": "OSM = refreshable public data. GAM/Central Traffic press-verified = approximate geo until field-verified. Manual overrides = highest trust. Do not hot-edit radars.json manually; edit tools/out/gam_amman.json or overrides.json and re-run merge.py.",
    }

    PREVIEW_DATA.mkdir(parents=True, exist_ok=True)
    payload = {"meta": meta, "zones": zones, "cameras": cams}
    (PREVIEW_DATA / "radars.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "merge_report.json").write_text(
        json.dumps({"generated": meta["generated"],
                     "per_type": {t: sum(1 for c in cams if c["type"] == t) for t in ("fixed", "light", "locality", "bump", "police")},
                     "zones": len(zones),
                     "verified": meta["verified_count"]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"merged -> {len(zones)} corridors + {len(cams)} cameras  |  sources: {', '.join(meta['sources'])}")
    print(f"wrote {PREVIEW_DATA / 'radars.json'} and {OUT / 'merge_report.json'}")

if __name__ == "__main__":
    main()
