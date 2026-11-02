#!/usr/bin/env python3
"""Check app/src/data/radars.ts encoding sanity + match against preview/data/radars.json."""
import json, re, sys

src = open("app/src/data/radars.ts", encoding="utf-8").read()
print("non-ascii chars:", sum(1 for ch in src if ord(ch) > 127))
m = re.search(r'"name": "([^"]*)",\n\s*"nameEn": "Airport Rd - segment 1"', src)
print("AR name segment1:", repr(m.group(1)) if m else "NOT FOUND")

data = json.load(open('preview/data/radars.json', encoding='utf-8'))
# extract the embedded JSON from the TS
k = src.find('export const RADAR_DATASET')
start = src.find('{', k)
end = src.rfind('};')
blob = src[start:end]
try:
    tsjson = json.loads(blob)
    same_zones = tsjson['zones'] == data['zones']
    same_cams = tsjson['cameras'] == data['cameras']
    same_meta = tsjson['meta'] == data['meta']
    print("zones identical:", same_zones, "| cameras identical:", same_cams, "| meta identical:", same_meta)
except Exception as e:
    print("TS JSON blob parse failed:", e)
    sys.exit(2)
