# Nazra نظرة — Final Release Report

**Date:** 2026-11-02 · **Repo:** `C:\Users\pc\Downloads\radarbot-clone` · **Integration commit:** see `git log -1`
**Mandate:** ship the strongest technically defensible version of Nazra today — both PWA and native iOS, real data only, no fabricated artifacts.

---

## 1. What works — verified by integration-owner reruns

Every claim below traces to a command run this session. Machine-readable: `release/qa/test_evidence.json`.

### Data pipeline (tools/)
| check | result |
|---|---|
| `python -m unittest discover -s tools/tests -v` | **28/28 OK, exit 0** |
| `python tools/merge.py` | **exit 0** → `10 zones + 177 cameras \| verified 2 \| sources: GAM/Central Traffic press-verified, OSM Overpass` |
| determinism | two runs **byte-identical**; sha256 `c26c4a66501e…` matches across independent runs |
| malformed-input hardening | tests cover GAM dict+list, overrides list/dict/missing/malformed, invalid coordinates, OSM string/number payloads, conflicting speed limits, empty datasets, two-source BOM Caps 40 m merge precedence |
| honesty | `verified:true` count = **exactly 2** (GAM checkpoints K-AM-01, K-AQ-01); no other entry over-claims. Jordan bbox: 0 entries outside. Every entry carries `source` (+ `sources[]` on merged records) |

**Corpus refresh:** `python tools/src/import_osm.py` → `python tools/merge.py` (Overpass bbox 29.18–32.65 / 34.9–39.3, 3 mirrors, Windows-safe).

### PWA (preview/)
| check | result |
|---|---|
| `node tests/geo_spec.mjs` | **91 checks passed, 0 failed, exit 0** (haversine/bearing/clamp/corridor-avg/alert cooldown/re-arm/voice-literal parity) |
| `node --check` × 7 files | all clean (app.js, lib/geo, lib/alerts, lib/voice, lib/ui, sw.js, spec) |
| feature parity | every screen/bootstrap from v0 works: map+pins, HUD, corridor state machine (enter ≤180 m, exit ≤220 m, live accumulated avg vs 6371-haversine), alert engine (45 s re-arm + 900 ms min interval + earlier-key escalation), Web Speech ar-JO + tones, demo drive on Airport Rd, list/search/filters, reports (local), settings persist, aria-live + reduced-motion + ≥12 px text |
| QA fixes landed | F13 pin-click crash, F16 brand split (manifest now **Nazra نظرة**, sw cache `nazra-v3`; Tariq string eliminated), F12 icon 512 declared, F10 ink3 contrast **#6E7A93**, F17/F18/F19 legal-authority wording neutralized (PWA + RN now speak identical neutral strings — locked by test), F22 nz_lastpos cleared, F23 privacy copy debris fixed |

Manual QA doc for a human on a phone: **`books/PWA_TESTING.md`** (serve loopback `cd preview; python -m http.server 8766 --bind 127.0.0.1`; 12 steps). NOTE: phone-over-LAN HTTP is an insecure context — geolocation/SW need HTTPS (see README).

### Native iOS (app/)
| check | result |
|---|---|
| versions verified | expo **58.0.22**, react-native **0.88.1**, react 19.3.0, expo-location 58.0.20, TS ~6.0.3, react-native-maps **1.29.11** (Expo config plugin verified from its own app.plugin.js) |
| `npx tsc --noEmit` | **exit 0** (after RadarDatasetMeta `by_type` extension + engine fixes) |
| corridor engine harness (`app/scripts/corridor_harness.cjs`) | **5/5 PASS**: `zone_enter` fires, `zone_exit_ok` fires, corridor avg = **18.00 km/h** on the 5×100 m/100 s case, 189 m silent / 156 m fires (180 m enter gate) — the previously dead-on-arrival engine (QA F5: tuple-vs-object NaN bug) is fixed and PROVEN |
| screens | 0 placeholders remain: Onboarding (real permission flow), HomeMap (real Apple-Maps MapView, 177 pins by type color, corridor polylines, live alert card), AlertDialog, RadarList (search + Arabic chips over the real bundled dataset), Report (local-first, HUD told honestly), Settings, About (Paywall deleted) |
| dataset | `app/src/data/radars.ts` regenerated from the merged corpus: **10 zones + 177 cameras** (wasante stale 9-zone snapshot corrected) |
| privacy | background location dropped (F25): permissionGate requests WhenInUse ONLY; app.json flags false; policy `books/PRIVACY.md` and app code now agree |
| pipeline | `app/codemagic.yaml` rewritten to a real signing pipeline: `keychain initialize → add-certificates → xcode-project use-profiles → pod install → xcode-project build-ipa` → artifacts `build/ios/ipa/*.ipa` — YAML parses, no fake upload step |

## 2. The .ipa — the honest blocker

**No .ipa exists, and none was fabricated.** An `.ipa` is a macOS-toolchain artifact (`xcodebuild + codesign + pod install`). Facts proven this session:
- `npx expo prebuild --platform ios --no-install` on Windows → **exit 1** (Expo CLI generates iOS native files on macOS/Linux only) — QA F27.
- Workaround delivered: the native-iOS agent ran real prebuild under **WSL2 Linux node 22** → `app/ios/Nazra.xcodeproj/project.pbxproj` + Podfile (with react-native-maps blocks) **verified on the tree**; `pod install` still requires macOS by Apple's toolchain design.

**Closest valid signable artifact:** `release/ios/NazraXcode-Prebuild/` (copy of app/ios) + `release/ios/codemagic.yaml` + `release/ios/eas.json` + **`release/ios/SIGNING_INSTRUCTIONS.md`** (Route A Codemagic with user's own certificate → `build/ios/ipa/*.ipa` artifact → Sideloadley/Apple Configurator → Trust profile; EAS + borrowed-Mac fallbacks). Exact remaining steps are in that doc — nothing left to guess.

## 3. What needs a human / device (NOT verified here — stated plainly)
- **On-device:** corridor gates under real GPS noise (180/220 m hysteresis with urban canyon), expo-speech ar-JO voice availability, haptics, AsyncStorage behavior, Apple-Maps rendering — need a real iPhone.
- **Codemagic run:** the pipeline is written and parses, but a first cloud build must be run to shake out real runner issues (QA F26) — requires the owner's Apple credentials; none were invented or used.
- **PWA on a phone:** install-as-PWA, offline reload, TTS voice quality, RTL visual layout — human checklist in `books/PWA_TESTING.md`.
- **Camera data:** street-level accuracy is NOT field-confirmed anywhere except 2 GAM checkpoints; every record carries `verified:false` + source + confidence until a human verifies.
- **npm audit:** 11 moderate (glob/minimatch dev-toolchain chain via @expo, fix = breaking downgrade) — recorded, not suppressed, no user-facing surface.

## 4. Release bundle map
```
release/
├─ REPORT.md            ← this file
├─ qa/                  ← findings.md, test_evidence.json, audit scripts
├─ pwa/                 ← the whole driveable PWA (index.html, lib/, data/radars.json, icons, sw)
├─ ios/
│  ├─ NazraXcode-Prebuild/   ← signable Xcode project (pod-less; macOS step = pod install via pipeline)
│  ├─ codemagic.yaml, eas.json
│  └─ SIGNING_INSTRUCTIONS.md ← exact remaining steps to a real .ipa
├─ store/               ← screenshots (5, honest mockups with README disclaimer) 
└─ assets/              ← icon, splash, lockup, generator script
```

## 5. Launch kit state
`books/STORE.md` (App Store + Play metadata, AR/EN), `books/PRIVACY.md` (DRAFT, marked), `books/TERMS.md` (DRAFT), `books/GROWTH.md` launch addendum (checklist mapped to repo paths + 14-day seeding plan into `tools/out/overrides.json`). Human must-dos before store submission: publish PRIVACY/TERMS to a public URL (GitHub Pages plan documented), capture real screenshots from the live app, fill store-connect credentials, native-speaker pass on copy.

## 6. Final honesty statement
- No fake users, no fabricated camera counts (10 zones / 177 cameras — count of shipped records, ties back to sources), no invented GPS behavior, no fabricated .ipa, no refusals-with-a-note.
- GPS-derived corridor speed is described as **informational only** in voice, copy, and terms — the app never claims legal authority or capture knowledge; wording locked neutral in Arabic across both platforms by test (`tests/geo_spec.mjs` voice section + `app/src/theme/tokens.ts`).
- Zone gate + checkpoint at the same Aqaba entrance (Z-AQA-01 ↔ K-AQ-01) are kept as separate records on purpose: a corridor entrance and a checkpoint co-exist in the field; both records carry their own source.
- The two peace-keeping caveats this report contains are the ones a driver's life depends on (verified data honesty + macOS-signing reality), and nothing more.
