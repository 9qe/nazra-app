# NAZRA 2.0 — Architecture Audit
**Scope:** working-tree audit of 2026-11-02 · every claim below traces to a file read this session
**Rule:** no rewrite of working systems until the audit says so.

---

## 1. What already works (verified)

### Data pipeline (`tools/`)
- `import_osm.py` — stdlib-only Overpass fetch, Jordan bbox (29.18–32.65 / 34.9–39.3), 3 mirror endpoints, normalizes and dedupes → `tools/out/osm_raw.json` (42 KB), `corpus.json` (103 KB).
- `merge.py` — deterministic 3-source merge (OSM Overpass → GAM press → manual overrides), 40 m haversine dedupe radius, precedence rules documented in-file (`BASE_KEEPS`, `OVERRIDE_KEEPS`), verified flags are per-entry only and **never manufactured by merging**. Deterministic byte output; `merge_report.json` carries per-source counters. **Output: 10 zones + 177 cameras (101 fixed, 66 light, 6 locality, 4 bump), exactly 2 `verified:true`.**
- 28/28 python unittests (`tools/tests/test_merge.py`) cover malformed input, invalid coordinates, GAM list/dict, BOM caps merge precedence, conflicting speed limits, empty datasets.

### Alert engine (the crown jewel — preserved)
- **PWA engine** `preview/lib/alerts.js` + `preview/lib/geo.js` — pure functions, DOM-free: `distKm` (haversine, R=6371), `bearing`, `avgSpeedKmH` (with dt≤3 s → 0 guard), `pickAlert` (band keys `cam_passing` ≤180 m / `cam_150` ≤350 m / `cam_300` ≤550 m, re-arm 45 s, global speak-gap 900 ms), route-accumulator with cap 400.
- **RN engine** `app/src/engine/AlertEngine.ts` — full contract parity, cleaner state: camera rings [500/300/150/60 m] with **60 m hysteresis on ring exit**; corridor state machine (ENTER ≤180 m, EXIT ≤220 m, sanity: abandoned-run kill via `PAST_FACTOR 1.5` and `maxRunMs` at crawl 8 km/h ×2); corridor average = accumulated haversine path over elapsed; `zone_exit_ok/bad` verdicts always emit.
- **Cross-check** `app/scripts/corridor_harness.cjs` — 5/5 PASS (gates, avg 18.00 km/h case, absent/short-fix absent in evidence).
- **91/91** checks in `tests/geo_spec.mjs` lock geo math, corridor behavior, and **char-for-char voice parity** between platforms.

### Native iOS app (`app/`) — real, not a shell
- Expo 58.0.22, RN 0.88.1, react 19.3.0, expo-location 58, react-native-maps 1.29.11, zustand 5, TanStack Query 5, TS ~6.0.3. `tsc --noEmit` exit 0 (prior session evidence).
- **Screens (7, all real, 0 TODO/placeholder in business paths):** Onboarding (real permission rationale + fallback-to-demo stated plainly), HomeMap (real Apple-Maps MapView, 177 type-colored pins, corridor polylines, follow-cam at 1.5 s cadence, live HUD: speed/nearest/corpus count, alert-card overlay), AlertDialog (feed + card with impact classes), RadarList (search + chips over the real corpus), Report (local-first AsyncStorage, cap 200, no fake submit), Settings (preDist ladder, threshold abs/pct, voice/MSA/haptics + the honestlydisabled background row), About (honest dataset provenance).
- **Engine wiring is textbook:** fix → `useAlerts` → pure engine → zustand `useAlertFeed` + expo-speech (ar-JO, rate 1.05; MSA fallback) + expo-haptics; settings read via ref so mid-drive toggles apply next event.
- **Privacy posture:** while-in-use only — `permissionGate.ts` never requests Always; `app.json` `"isIosBackgroundLocationEnabled": false`; Settings carries a deliberately disabled background row saying why.

### PWA (`preview/`)
- Modular: `app.js` is the only DOM/network layer; all math lives in `lib/{geo,alerts,voice,ui}.js` (imported by the Node spec). Leaflet + Carto dark raster via CDN.
- Full loop: live GPS (EMA speed smoothing 0.4/0.6, heading from GPS only when moving), corridor panel with live accumulated avg + remaining, alert card, HUD dial, demo drive (scripted Airport Rd at 1.4 s ticks), list/search/filter, local reports, settings persisted to localStorage, service worker `nazra-v3` cache-first shell / network-first JSON.
- Accessibility: `aria-live` announcements via `announce()`; toast `role="status"`; reduced-motion honored (prior session QA).

### Corpus dual-import
- `preview/data/radars.json` (source of truth) → `app/scripts/gen-radars.mjs` → typed `app/src/data/radars.ts` (fails loudly on shape drift) → `radarDataset.ts` flattened views → engine-shaped `ALERT_POINTS`/`ALERT_ZONES`.

### Release plumbing
- `.github/workflows/nazra-ipa.yml` — macos-26, Node 22, `expo prebuild`, `pod install`, unsigned xcodebuild (`CODE_SIGNING_ALLOWED=NO`), find-based packaging → .ipa. **Green run 41467292441 delivered real 9.5 MB ARM64 .ipa** (unsigned → Sideloadly path). Signed route exists in `app/codemagic.yaml` / `release/ios/` awaiting the owner's 4 secrets.

---

## 2. What is incomplete

| Area | State | Evidence |
|---|---|---|
| **Navigation / routing** | **does not exist at all** | No Directions/router call, no route-alternatives UI, no turn-by-turn anywhere in `app/` or `preview/`. PWA `route` array is only a GPS breadcrumb buffer for corridor math. The "route" sheet tab is a stub string. |
| **Destination search** | **does not exist** | RadarList search filters the camera corpus only. No geocoder/POI anywhere. |
| **Report feed → other users** | local-only | PWA saves to `localStorage.nz_reports`; RN to AsyncStorage `nazra-reports-v1`. **No sync, no server, no confirmation loop, no leave/expiry — by design ("no fake submitted").** |
| **Report categories** | sync-focused, not incident-focused | Categories are camera types (`avg, fixed, light, locality, bump, other`). **No accident / roadwork / closure / flooding / broken-down vehicle nouns** — the sheet even says "later report" for anything real. |
| **Background location / always-on alerts** | deliberately OFF | `isIosBackgroundLocationEnabled: false`, requires native config that "ships in a later build" — documented honestly, not broken. |
| **Offline maps** | none | PWA tiles come from Carto CDN at runtime; RN uses Apple-Maps MapKit online tiles. SW caches only the shell + radars.json. |
| **Traffic data** | none | No traffic feed anywhere, and no UI claims it — Nav screen ideas relying on it must be gated. |
| **Trip history / stats** | none | No trip store exists in either platform. |
| **Zizo assistant** | passive narrator only | Zeizo exists as voice lines + persona (`tokens.ts`, `research/brand.json`); **no command input, no tool architecture**. |
| **CI tests** | not in CI | `.github/workflows/` contains **only** nazra-ipa.yml (build). Tests (python 28, node 91, RN harness 5) run locally, never on push. |
| **Corpus import schedule** | manual | Overpass re-import is a dev command, refreshable — automation absent. |
| **App Store route** | sideload-only | Signed .ipa blocked on 4 secrets (p12, password, mobileprovision, team id); bundle id `jo.nazra.app` locked. |

## 3. What should be improved (working systems, sharpened)

1. **Alert engine → road-position-aware.** Today alerts fire on radial proximity; nearest-by-straight-line is wrong when a camera serves one direction of a dual carriageway. Add `bearing ∈ heading ± cone` direction gating for fixed/light cams (data exists via GPS heading) and corridor path-following instead of ring radii. This cuts wrong-way false alerts — real driving-reliability gain.
2. **Duplicate suppression in PWA** symmetry: RN has hysteresis on ring exit; PWA `bandKey` uses `seen[]` only — a driver oscillating at 330 m re-speaks after re-arm. Port the 60 m exit hysteresis back into `pickAlert` and lock with 3 new spec cases.
3. **Report schema v2:** unique id, expiry (relative to type: hazard 2 h default, closure until cleared ×N confirmations), `confirmCount / rejectCount`, `source` (device id hash), `confidence` — contract mirrored in preview + RN + (soon) backend.
4. **Voice duration math:** PWA `dueSec` divides by `Math.max(20, speed)` assuming floor 20 km/h for eta — reasonable, but for corridors specify "remaining to exit" rather than to gate. Minor.
5. **Wording for `zone_exit_bad`** is right; add adaptive-threshold suggestion later, no urgency.
6. **Data refresh:** schedule Overpass → merge via GitHub Action (cron monthly) and auto-open a PR with the diff — the whole pipeline is already deterministic so review is cheap.
7. **Tests in CI:** one workflow step (`python -m unittest`, node spec, RN harness, tsc) on every push — zero cost, protects the engine.
8. **RTL/typography polish:** RN screens lack `accessibilityLabel` parity with PWA `aria-live`; add before store submission.
9. **Type reuse:** `app/src/api/geoApi.ts` still sources from `stubRadars.ts` (fabricated dataset) while `radarDataset.ts` carries the real bundled corpus — collapse into one dataset seam so no fake pack ever surfaces in production paths.
10. **`gen-radars.mjs` conservative types:** `TYPES` excludes `checkpoint`/`police` but merge.py `ALL_TYPES` includes them — align the allow-lists so corpus drift can't silently drop a record class.

## 4. What should be removed / replaced

| Item | Why |
|---|---|
| `app/src/data/stubRadars.ts` "plausible coordinates" | a fabricated dataset by definition; replaced by the real `radars.ts` bundle. Keep only as test fixture file, renamed, or delete. |
| PWA "route" sheet stub (`مسارك الكامل — قريبا ملي حكاية`) | becomes real when navigation lands (Pillar A); until then keep but reword to a truthful "قيد البناء". |
| `books/PRD.md` heading "Jordan Officer" | legacy brand from before Nazra naming decision — confusing; supersede with `NAZRA_2_PRODUCT_SPEC.md` and mark old PRD archived. |
| Onboarding copy "١٧٧ كاميرا و ٩ مقاطع" | actual count is **10 zones**; correct to read counts from `DATASET_META`/corpus meta instead of hardcoding. |
| `bgoff`/`share` settings that do nothing yet (PWA) | `share` toggles nothing (no share sheet exists); either implement or remove the toggle. `bgoff` is honest (visible pause), keep it. |
| README "Route B Codemagic" emphasis | sideload unsigned route is today's reality; signed route needs Apple secrets. Reword but keep both. |

## 5. What can be reused (asset list)

**Directly reusable as-is:** haversine/bearing/clamp/avg math (both platforms); AlertEngine contract (points/zones/events/types); threshold config surface; voice dictionaries + `mapAlertCopy` pattern; SW architecture; `gen-radars.mjs` bundler; merge.py + import_osm.py pipeline; corridor harness + spec patterns; zustand stores pattern; `permissionGate.ts`; `<MapView>` HomeMap shell; corpus dedupe/precedence logic; MoU-scale naming/id scheme (K-AM-01 etc.).

**Reusable with extension:** `radarDataset.ts` (needs event-type extension beyond cameras); `useLocationStream.ts` (needs Phase 7 background task later); `useAlerts.ts` (needs to run above navigation sessions too, not only as an independent screen effect); `Voice` engine (needs a navigation-utterance vocabulary prefix; lend queue priority to nav instructions over camera warnings, cameras win only when close).

## 6. What requires a backend

- Community report sync (write path + read path), conf/rej aggregation, deduplication, abuse rate-limits.
- Reputation/contribution history.
- Corpus update push (or versioned static-file strategy — passable without backend using a versioned JSON + ETag; see `MAPPING/BACKEND` docs).
- Push notifications for "what changed on your route" weekly push (only when a backend exists).
- Account system if we ever build cross-device profile sync — **recommend not for V1; guest/device ID only.**

Everything else (alerts, corridor, routing display, voice) can and should ship offline-first from the bundled corpus.

## 7. What requires external providers

| Need | Provider class | Notes |
|---|---|---|
| Turn-by-turn nav + ETA + reroute | Mapbox Navigation SDK v3 / Google Navigation SDK / OSRM+Valhalla self-host | see `MAPPING_PROVIDER_COMPARISON.md` |
| Geocoding + POI search | Mapbox Geocoding / Google Places / Nominatim / Photon self-host | Arabic address quality is a Jordan-specific risk |
| Map tiles beyond Apple-Maps default | Mapbox Vector (best styling) / Carto (already in PWA) / MapLibre self-host | offline regions = vector tile sets |
| Live traffic (not yet claimed) | Mapbox Traffic / Google Traffic layers / HERE Traffic API | blocked until a revenue or pilot story exists; **never fake it** |
| Push | Expo Push + FCM/APNs (free tier) | |
| AI assistant (Phase 5) | none required initially; optional LLM later | rule: don't buy AI before nav+reports work |

## 8. Cost & licensing implications

- **Mapbox:** free ≤25k Monthly Active Users on Mobile Maps SDK; Navigation SDK v3 free ≤100 MAU and ≤1,000 trips/mo → **Phase-1 pilot can run on free tiers**; paid $0.30/MAU + $0.08/trip (metered per-trip) beyond. Attribution + ToS compliance required in-app. [source: mapbox.com/pricing, read live this session]
- **Google Maps Platform:** new subscription tiers (Starter $100/50k calls, Essentials $275/100k calls, Pro $1,200/250k calls); Navigation SDK commercial terms apply — heavier for a student founder. [source: mapsplatform.google.com/pricing, this session]
- **OSRM/Valhalla self-host:** free software; Jordan extracts are small (≤~50 MB pbf); requires a VPS ($10–20/mo) and ops discipline. No SDK polish — UI must be built in-house on react-native-maps or MapLibre.
- **Supabase:** free tier (500 MB DB, 5 GB egress, 50 k MAU auth, 2 projects) — enough through the first ~10 k MAU of report sync; Pro $25/mo after.
- **Apple Developer:** $99/yr required for TestFlight/App Store/release signing (not for unsigned sideload).
- **Backend for moderation/admin:** manual at first (SQL/rollback), no tooling expense.

## 9. Technical risks

| Risk | Severity | Mitigation |
|---|---|---|
| Mapbox Navigation SDK inside Expo | High | prebuild is already managed (workflow proves it); the SDK is a native cocoapod — needs a config-plugin or manual Podfile edit; budget a spike. Fall back to a Mapbox-Directions-API + react-native-maps thin UI if the SDK integration stalls (loses turn-by-turn voice polish, keeps routing). |
| Arabic address quality (geocoding) | Medium | test a corpus of 30 real Amman destinations against each candidate before deciding; Nominatim/Photon on OSM data can validate Mapbox output; fallback = search our own POI/camera dataset first (always works offline). |
| Corridor veracity at scale (177 → field-verified) | Medium | maintain `verified` flagging, add community confirm flow in Phase 3; never manufacture flags. |
| Battery/GPS drain with nav-always-on | Medium | keep `Accuracy.High`, 8 m/1 s cadence; evaluate `Accuracy.BestForNavigation` later; add a battery-diff page to Testing checklist. |
| Overpass reliability | Low (already 3 mirrors) | keep. |
| Two aprons diverging (PWA vs RN drift) | Medium | move shared contract – schemas, thresholds, voice keys – behind a single `books/CONTRACTS.md` + the existing cross-platform test; every incident-type addition must pass the parity spec first. |
| macOS signing (App Store) | Ops | secrets must come from the owner; nothing reproducible without them. |
| Community abuse/spam | Medium | server-side validation (never trust client), rate-limits, anomaly heuristics; design in `NAZRA_2_BACKEND_ARCHITECTURE.md`. |

## 10. Recommended implementation order

1. **Hygiene & truth pass** (no new features): CI tests workflow; remove stub dataset seam; fix onboarding count; align type allow-lists; reword stub route tab. (1 day-equivalent)
2. **Alert engine upgrades** (direction gating + PWA hysteresis parity + report schema v2 client-side). (1–2 days)
3. **Phase 1 — Navigation foundation** with provider abstraction; **provider decision gated on a live spike** (Mapbox nav vs Directions+maps UI). Ship destination search over bundled corpus + geocoder, single-route skeleton, then turn-by-turn.
4. **Phase 2 — Camera/hazard alerts feed the navigation session** (AlertEngine subscribed to fix stream; audible over nav audio with explicit priority).
5. **Phase 3 — Community backend** (Supabase first pass; PWA+RN read from server when online, write with rate-limits, offline queue).
6. **Phase 4+ forward** per roadmap doc (Jordan services, Zizo, Trip history, Automotive, Growth).

---

**Bottom line:** the foundation is unusually strong for a solo project — the alert/corridor engine, corpus, and honesty tooling are production-grade and well-tested. What does **not** exist yet is any navigation, any live-data surface, or any backend; those areIsNull net-new builds, not rewrites. Preserve everything in §1; execute §3 improvements before new pillars; execute phases in §10 order.
