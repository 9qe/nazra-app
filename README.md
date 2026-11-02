# Nazra نظرة — Jordan's first traffic co-pilot you can actually drive.

**One line:** “الكاميرا قبل ما تشوفك” — a Jordan-first co-pilot that tells you
the camera before the camera tells you. One object, six colors, one eye, one voice
(زيدو). No ads while driving. Zero-Radarbot baggage.    Now with a real `.ipa`
pipeline.

> **Fastest way to feel it right now:**
> `cd preview && python -m http.server 8766 --bind 0.0.0.0` → open `http://<laptop-ip>:8766`
> on your phone → "Add to Home Screen" → press **ديمو: قيادة على شارع المطار 🚗**
> to watch the co-pilot pipe up along Airport Road while you're sitting still.

## What's here
```
radarbot-clone/
├─ books/
│  ├─ PRD.md       — what's built, what's not, and *why*
│  ├─ RAM.md       — every Radarbot feature → evidence → our build
│  ├─ IPA.md       — three loud, honest routes to a real `.ipa`
│  └─ GROWTH.md    — "genuinely viral, not slop" playbook (Jordan-first engine)
├─ research/
│  ├─ features.json  — Radarbot competitor matrix, ASO, monetization, 11 weaknesses
│  └─ jordan.json    — Jordan camera reality, legal, dialect, market, gaps
│  └─ brand.json     — Nazra نظرة: name, mascot, palette, Zeizo voice, viral hooks
├─ preview/
│  ├─ index.html / app.css / app.js / sw.js  — the driveable co-pilot (RTL, dark,
│  │                                            Leaflet+Carto dark, Zeizo voice
│  │                                            via Web Speech, offline SW)
│  ├─ data/radars.json  — merged corpus (press-verified GAM/Central Traffic + OSM)
│  └─ icon.png / icon-512.png / manifest.json
├─ tools/
│  ├─ import_osm.py — Overpass fetch → normalized, deduped corpus
│  ├─ merge.py      — source merge with precedence, per-type counts, verify flag
│  └─ out/          — osm_raw.json / corpus.json / gam_amman.json / overrides.json
└─ app/             — React Native (Expo 58, TS) skeleton the `.ipa` falls out of
```

## Customise fast
All the "voice" and the palette live in **`app/src/theme/tokens.ts`** and
**`preview/app.css`**: - palette is Wadi-Rum Night + Gerasa Stone + Petra Rose +
Nazar Blue + Ajloun Pine + Dana Amber.  - `dialect_lines` has the 12 exact Jordan-dialect
alerts plus 6 MSA fallbacks. You want the voice to be a mod of your own? Drop into
`preview/app.js` lines 20-40.

## What's different from the three majors
| | RadarBot | Waze | Google Maps | **Nazra**
|---|---|---|---|---|
| Camera types distinguishable (avg-speed corridor vs fixed vs traffic-light vs police)
| ✅ partially | ⚠️ self-reported only | ❌ | ✅ via evidence-tagged corpus
| Jordan-corridor detail (9 avg-speed corridors on Airport Rd + Jordan St)
| ❌ | ⚠️ | ❌ | ✅ from GAM Apr-2026 published lists
| Exact legal speed limit at each camera | ⚠️ | ⚠️ | ⚠️ | ✅ from OSM `maxspeed` + overrides
| Alerts allowed while driving (no forced ads, no interstitials)
| ❌ (top complaint) | ✅ | ✅ | ✅ enforced — no ads anywhere
| Voice language that actually talks Jordanian | ⚠️ | ✅ | ⚠️ | ✅ — Zeizo's Karaki
| Community report loop | ❌ | ✅ | ⚠️ | ✅ + weekly "التقرير المخابراتي" rank push
| Full offline | ✅ paid | ⚠️ | ✅ | ✅ free
| Confidence score per camera record (honest data) | ❌ | ❌ | ❌ | ✅

## Run it
### PWA (now, no signing)
```pwsh
cd preview; python -m http.server 8766 --bind 0.0.0.0
```
### Corpus update (whenever you bump data)
```pwsh
python tools\import_osm.py       # Overpass -> tools/out/osm_raw.json
python tools\merge.py            # -> preview/data/radars.json
```
### Real `.ipa` (Apple paid dev, w/o owning a Mac)
Read **`books/IPA.md`** — Route A (Codemagic) is the fastest Windows path;
`app/codemagic.yaml` + `app/eas.json` are already wired.

## What's not yet (honest)
- Field-confirming a few of the GAM-press -- and OSM-based coordinates (we carry them with
  `verified: false` and show "بيانات من مصدر عام" chip — **do not silently trust**).
- OSM audit per segment for specific Amman-Zarqa / Dead Sea Hwy / Aqaba 120 km/h stretches.
- Community sync server — reports live in `localStorage` for now in the PWA, wire to
  `app/src/api/geoApi.ts` on the RN side for real server presence.
- Anything about "beating" the radar. We are a co-pilot, not a jammer.
