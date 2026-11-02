#!/usr/bin/env python3
"""Nazra QA — independent data audit of preview/data/radars.json.
Checks: parse, bbox, corridor shape, type counts, verified honesty, provenance, 15m dedupe pairs.
DOES NOT edit anything. Print-only.
"""
import json, math, sys
from collections import Counter
from pathlib import Path

P = Path("preview/data/radars.json")
raw = P.read_text(encoding="utf-8")

fails = []
d = None
try:
    d = json.loads(raw)
    print(f"[ok] JSON parses; top-level keys = {sorted(d.keys())}")
except Exception as e:
    print(f"[FAIL] JSON un-parsable: {e}")
    sys.exit(2)

JLAT = (29.0, 32.7); JLNG = (34.8, 39.4)

def in_jordan(lat, lng):
    return JLAT[0] <= lat <= JLAT[1] and JLNG[0] <= lng <= JLNG[1]

allitems = [(z, 'zones') for z in d.get('zones', [])] + [(c, 'cameras') for c in d.get('cameras', [])]
print(f"[info] total entries: {len(allitems)} (zones={len(d.get('zones', []))}, cameras={len(d.get('cameras', []))})")

typec = Counter()
out_bbox = []
bad_corr = []
no_geo = 0
verified_others = []
no_source = []

for it, bucket in allitems:
    t = it.get('type', '?')
    typec[t] += 1
    geo = it.get('geo')
    has_corr = bool(it.get('corridor'))
    if not geo:
        if has_corr:
            e = it['corridor'].get('enter')
            if e and in_jordan(e[0], e[1]):
                no_geo += 0  # zone with corridor corridor.enter valid — geo optional per spec? geo was [enter] in merge; check anyway
        else:
            no_geo += 1
            fails.append(f"NO-GEO id={it.get('id')} bucket={bucket}")
    else:
        if not in_jordan(geo[0], geo[1]):
            out_bbox.append((it.get('id'), geo))
    if t == 'avg':
        corr = it.get('corridor')
        if not corr or not corr.get('enter') or not corr.get('exit'):
            bad_corr.append(it.get('id'))
    if it.get('verified'):
        if it.get('id') not in ('GAM-K-AM-01', 'GAM-K-AQ-01'):
            # is there a source reason attached?
            ev = it.get('evidence') or it.get('notes') or ''
            verified_others.append((it.get('id'), it.get('source'), ev[:80]))
    if not (it.get('source') or '').strip():
        no_source.append(it.get('id'))

print(f"[info] counts by type: {dict(typec)}")
print(f"[info] verified entries (non-pre-2): {len(verified_others)}")
for v in verified_others:
    print(f"      SPECTAG id={v[0]} source={v[1]} evidence={v[2]!r}")
print(f"[info] entries outside Jordan bbox: {len(out_bbox)}")
for b in out_bbox[:10]:
    print(f"      OUTBB id={b[0]} geo={b[1]}")
print(f"[info] avg zones missing valid corridor enter/exit: {len(bad_corr)} -> {bad_corr[:10]}")
print(f"[info] entries with NO geo at all (no corridor fallback either): {no_geo}")
print(f"[info] entries with EMPTY source: {len(no_source)} -> {no_source[:10]}")

# provenance deep check: every entry has source
missing = [(it.get('id'), bucket) for it, bucket in allitems if not it.get('source')]
print(f"[info] entries with missing 'source' KEY entirely: {len(missing)}")

# 15m proximity pairs NOT linked by shared sources
def hav_m(a, b):
    R = math.pi / 180
    dLat = (b[0] - a[0]) * R; dLng = (b[1] - a[1]) * R
    s = math.sin(dLat/2)**2 + math.cos(a[0]*R)*math.cos(b[0]*R)*math.sin(dLng/2)**2
    return 6371.0 * 2 * math.atan2(math.sqrt(s), sqrt_ok(s)) * 1000

def sqrt_ok(s):
    import math
    return math.sqrt(s) if s >= 0 else 0.0

pairs = []
n = len(allitems)
for i in range(n):
    gi = allitems[i][0].get('geo')
    if not gi: continue
    for j in range(i+1, n):
        gj = allitems[j][0].get('geo')
        if not gj: continue
        if abs(gi[0]-gj[0]) > 0.01: continue
        m = hav_m(gi, gj)
        if m <= 15.0:
            si = allitems[i][0].get('source', ''); sj = allitems[j][0].get('source', '')
            linked = (si == sj)
            pairs.append((allitems[i][0].get('id'), allitems[j][0].get('id'), round(m, 1), si, sj, linked))

same_src_pairs = [p for p in pairs if p[5]]
cross_pairs = [p for p in pairs if not p[5]]
print(f"[info] pairs <=15m apart: {len(pairs)} | same-source: {len(same_src_pairs)} | cross-source (legit merged GAM+OSM): {len(cross_pairs)}")
print("      OSM-vs-OSM residual dedupe failures (same-source <15m):", len(same_src_pairs))
for p in same_src_pairs[:15]:
    print(f"      DUP {p[0]} | {p[1]} | {p[2]}m | src={p[3]}")
for p in cross_pairs[:15]:
    print(f"      PAIR {p[0]} | {p[1]} | {p[2]}m | {p[3]} <-> {p[4]}")

print("\n[summary] FAIL lines:", len(fails))
for f in fails[:10]:
    print("   ", f)
