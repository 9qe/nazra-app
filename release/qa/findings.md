# Nazra QA — independent audit findings

> Auditor: QA/SECURITY subagent, session 2026-11-02. Read-only audit of other agents' work;
> every entry below traces to a command I ran or a file+line I read in this session.
> INTERIM SNAPSHOT taken mid-integration — the data-pipeline, PWA-modernization and RN-native
> agents were still writing while I audited; items marked ⟳ are re-checked at the end.

## Findings table

| # | check | result | severity | file+line | one-line fix for integrator |
|---|---|---|---|---|---|
| F1 | tools/tests unittest | absent at snapshot ⟳ | BLOCKER-while-absent | tools/tests/ (missing) | land the test suite; QA re-runs `python -m unittest discover -s tools/tests -v` |
| F2 | node tests/geo_spec.mjs | absent at snapshot ⟳ | BLOCKER-while-absent | tests/geo_spec.mjs (missing) | land spec; QA re-runs |
| F3 | merge determinism | PASS (baseline): 2 runs byte-identical, SHA256 35648EBA… | ok | tools/merge.py:145-146 | — |
| F4 | tsc --noEmit | FAIL (exit 2): 4 errors — radarDataset.ts confidence optional, AlertEngine tuple→GeoPoint ×3 | Blocker | app/src/data/radarDataset.ts:12, app/src/engine/AlertEngine.ts:234,236,277 | wrap zone gate tuples `{lat: z.enter[0], lng: z.enter[1]}` (use `pair()`), make `Camera.confidence` `number \| undefined` |
| F5 | AlertEngine corridor runtime | DEAD-ON-ARRIVAL (repro'd): feeding a 21-fix corridor run emits zero events — `distanceKm()` receives `[lat,lng]` tuples, reads `.lat/.lng` → undefined → NaN distances → `NaN<=80` false → no enter/exit ever | Blocker | app/src/engine/AlertEngine.ts:234,236,277 | same fix as F4 — the TS compile errors ARE this runtime bug |
| F6 | corridor thresholds PWA vs RN MISMATCH | PWA enter 180 m / exit 220 m (preview/app.js:287 `<0.18`, :296 `<0.22`); RN uses single 80 m gate (`zoneHitRadiusM` default 80) both sides | Major | app/src/engine/AlertEngine.ts:120 (DEFAULT_ZONE_HIT_M=80) + preview/app.js:287/296 | align: enter 180 / exit 220 (or make both configurable from one spec) |
| F7 | corridor avg-speed formula PWA | correct: haversine R=6371, `km*3600/dt` (preview/app.js:304-312) | ok | preview/app.js:304-312 | — |
| F8 | corridor avg RN uses declared lenM | RN `avgKph = (runLenM/elapsed)*3.6` from DECLARED segment length vs PWA path-accumulated km — different numbers on detours | Minor | app/src/engine/AlertEngine.ts:279 (snapshot number; file moving) | pick one definition both platforms (accumulated km is the more defensible) |
| F9 | dead/broken helpers in AlertEngine | `stRunLen`/`zoneRunLen`/`runLenCache` half-wired; earlier snapshot had `st.runLenCache(z.id)` (method on `st` that doesn't exist) — crash-on-zone-exit even if F5 fixed; NOTE(stale-code-sweep) admits dead code | Major | app/src/engine/AlertEngine.ts:305-324, 334-335 | collapse helpers into `fire()` or cache len on ZoneRun object |
| F10 | `--ink3 #5C6678` on `--surf #211D29` contrast = 2.85:1 | FAIL below 4.5 AND below 3.0 — used for tab labels, stat labels, and the privacy disclosures themselves | Major (a11y) | preview/app.css:6,50,59,99,115,119,131,139,148,158,168,171,182,232,236?; employed for `.ob-legal`, `.tab`, `.rep-auto`, `.c-sub`, `.ac-micro` | lift `--ink3` to ≥ #6E7A93 (≈4.5:1) or stop using it for body-size legalese |
| F11 | --ink2 contrast | PASSES at 6.53:1 (the brief's ≈4.2:1 estimate was wrong — measured) | ok | preview/app.css:6 | — |
| F12 | manifest icon size mismatch | manifest declares `icon.png` 192×192; real PNG is 512×512 | Minor | preview/manifest.json:15 | declare 512×512 or ship a real 192 |
| F13 | map pin click crash | `showCamPopup(it, mj)` — `mj` undeclared → ReferenceError on EVERY pin click, popup never opens | Major | preview/app.js:180 | pass `mk` (the constructed marker) |
| F14 | offline map is paper claim | SW precaches shell only; cross-origin fetches (`unpkg.com` Leaflet + `cartocdn` tiles) are skipped in fetch handler (sw.js:26) → NOT cached → offline = no map, no leaflet JS at all | Major | preview/sw.js:4,26 | runtime-cache Leaflet CSS/JS on first load (or self-host) + cache-first tiles with versioned cap; tiles must NOT be precached (they aren't — good) |
| F15 | README quick-start breaks geolocation on phone | `--bind 0.0.0.0` + `http://<laptop-ip>:8766` = insecure context on the phone → geolocation AND service-worker blocked; loopback on the laptop itself is fine | Major (docs honesty) | README.md:9,63 | add "serve over HTTPS (self-signed or `npx local-ssl-proxy`) for phone testing; http LAN URL only shows the map sandboxed" |
| F16 | brand identity split | manifest says "Tariq — طريقك بيدك"/short Tariq + sw.js V='tariq-v1' + index.html/apple-title says "Nazra نظرة" | Major | preview/manifest.json:2-3, preview/sw.js:3, index.html:9 | rename to Nazra everywhere, bump SW version |
| F17 | legal-authority wording (VOICE) | `cam_passed_clean 'نقاطك ما لمسها حد'`, `cam_passed_flash 'فلاش 📸'` assert capture/points outcomes the app cannot know | Minor→Major | preview/app.js:42-43, app/src/theme/tokens.ts:46-47 | neutralize: "خفّف/عدّيتها بصافي — متابعه" i.e. describe own-estimate, never an outcome |
| F18 | legal-authority wording (MSA) | `MSA.cam_passed_flash = 'تم تسجيل تجاوز سرعة.'` — implies official capture; the tone/note also flags it | Major | preview/app.js:60 | replace with neutral 'اتبع الحد المسموح' |
| F19 | MSA pass_clean `اجتزت نقطة المراقبة قانونياً` | "passed legally" = legal judgment from our own GPS estimate | Minor→Major | app/src/theme/tokens.ts:59 | 'انتهى منطقة المراقبة' |
| F20 | useAppStatus persist no-op on native | `localJson` only bridges `globalThis.localStorage` (undefined in RN) → zustand persist silently disabled on device though comment claims AsyncStorage bridging | Major | app/src/store/useAppStatus.ts:36-45 | bridge to @react-native-async-storage/async-storage (dep already added) |
| F21 | storage key typo | `name: 'app-staus-v1'` (stale key name shipped with comment "bump on store shape change") | Minor | app/src/store/useAppStatus.ts:36 | 'app-status-v1' NOW while no users exist |
| F22 | nz_lastpos not cleared by reset button | `btn-clear` removes nz_opts/nz_reports but not nz_lastpos | Minor | preview/app.js:505,540 | removeItem('nz_lastpos') too |
| F23 | PRIVACY.md translation debris | `.ReadLine` artifact mid-paragraph | Minor | books/PRIVACY.md:13 | clean copy pass |
| F24 | TERMS.md translation debris | untranslated `legge` in Arabic legal line | Minor | books/TERMS.md:13 | clean copy pass |
| F25 | privacy doc vs manifest contradiction | PRIVACY.md: "while-in-use only — never Always" vs app.json enables background location (isIosBackgroundLocationEnabled:true, ACCESS_BACKGROUND_LOCATION, NSLocationAlwaysAndWhenInUse) and permissionGate requests background | Major | books/PRIVACY.md:27-28,77-82 vs app/app.json:19,52-53, app/src/security/permissionGate.ts:39-42 | either drop background config/request until the feature really lands, or rewrite the policy — do not ship the mismatch |
| F26 | codemagic pipeline unverified + gaps | `xcodebuild` runs with no signing identity/allowProvisioningUpdates; "Upload artifact" step is `echo` only; "sign" comment in step name is misleading | Major (blocker for .ipa) | app/codemagic.yaml:35-48 | run the documented pipeline on Codemagic once and fix the real failure; use xcode-project build-ipa or add -allowProvisioningUpdates |
| F27 | expo prebuild iOS impossible on Windows | `npx expo prebuild --platform ios --no-install` → exit 1 "Skipping generating the iOS native project files. Run … from macOS or Linux" → no `ios/Nazra.xcodeproj/project.pbxproj` locally | Major (blocker for .ipa) | books/IPA.md Route D reality vs books/IPA.md:35 | settle on Codemagic (Route A); correct IPA.md Route D wording |
| F28 | npm audit | 11 moderate vulns (minimatch DoS chain via @expo tree), exit 1; fix = expo@53 downgrade (breaking) | Minor | app/package-lock.json | record; no user-facing attack surface (tooling only) — re-audit after dependency bumps settle |
| F29 | expo-doctor | PASS 20/20, exit 0 (baseline; ⟳ re-run at settle) | ok | — | — |
| F30 | expo export web baseline | PASS: exit 0, dist/index.html exists (1209 bytes) (⟳ re-run at settle) | ok | — | — |
| F31 | node --check baseline | app.js + sw.js both PASS exit 0 (⟳ re-run on lib/* after the split) | ok | — | — |
| F32 | dead convenience + list rows without handlers | maxSpeed() dead (preview/app.js:233); `.rlist li` cursor:pointer but no click handler → list rows are dead UI | Minor | preview/app.js:233,427-443 | wire row -> camera detail or drop cursor |
| F33 | nameless OSM entries render blank rows | several cameras have empty name+nameEn (`relation/196451` etc.) → blank-row UI on list/popup | Minor | preview/data/radars.json (OSM entries) | fall back to `type` glyph + coordinates in name slot |
| F34 | Settings "Last sync" claim | label claims sync that does not exist (stub-only set-on-press) | Minor | app/src/screens/Settings/SettingsScreen.tsx:60-63 | label "permissions snapshot time" instead |

## Data audit (preview/data/radars.json @ 2026-11-02 baseline; ⟳ after pipeline rewrite)

- JSON parses; top-level {meta, zones, cameras}. zones=9, cameras=177 (101 fixed, 66 light, 6 locality, 4 bump).
- Jordan bbox (lat 29.0–32.7, lng 34.8–39.4): 0 entries outside. ✓
- All 9 `avg` zones carry corridor{enter,exit} + lenM + limit. ✓
- Every entry has non-empty `source` key; no empty-source. ✓ sources: "GAM/Central Traffic press-verified", "OSM Overpass".
- verified:true count = 2 = exactly K-AQ-01 + K-AM-01 (both GAM checkpoints). No other entry over-claims verified. ✓
- 15 m proximity pairs (pairwise haversine): 0 same-source pairs; 0 cross-source pairs (GAM↔OSM). Dedupe is clean at baseline. ✓
- OSM camera entries include an `evidence` tag bag (dict); GAM entries have no evidence — honesty is carried by verified:false + source + notes meta. ✓

## Corridor math audit (baseline; ⟳ after modular split + RN)

- PWA haversine R=6371 ✓ (preview/app.js:12); avg = km*3600/s ✓ (:311); enter 180 m / exit 220 m ✓ (:287,:296) — matches spec.
- RN haversine R=6371.0088 (utils/geo.ts:3) — negligible deviation, OK; corridor thresholds do NOT match (F6); avg formula differs (F8).
- No code queries/remits fines; the PWA pill and voice stay advisory. The two hard wording offenders are F17/F18.

## Offline/privacy audit (baseline; ⟳ after split lands)

- sw.js: versioned cache V='tariq-v1' (F16 brand), precache list = shell + ./data/radars.json ✓, tiles NOT precached ✓, but cross-origin assets never cached (F14).
- app.js network surface: exactly one fetch (./data/radars.json) + third-party map CDN/tiles ✓ (grep: no other fetch/XHR/WebSocket).
- localStorage keys: nz_opts, nz_reports, nz_lastpos. Report-position capture is disclosed inline at the report flow ("بلاغك بيلتقط موقعك الحالي") and settings offers share opt-out; nz_lastpos is less visible + not cleared (F22).
- geolocation secure-context: loopback http on the laptop works (localhost is a secure context); the README's phone-over-LAN http directive is what breaks (F15) — document, don't hide.

## Security audit (light, honest)

- No eval/new Function/document.write anywhere in preview/app.js|sw.js|index.html. ✓
- innerHTML sinks at preview/app.js:385 sheetSet + :442 list render — inputs are the OWN static shipped dataset + constants; user-typed search text is used for filtering only, never interpolated (:433). XSS surface: no untrusted input reaches innerHTML in the current build. If/when community JSON ever becomes remote, mask these sinks.
- Credential sweep via git-tracked file list: no api-key/secret/token literals; codemagic.yaml:$CM_CERTIFICATE_PASSWORD is a var reference; `APPLESIGNER_KEYCHAIN_PASSWORD: keychain-password` is the standard runner-generated placeholder, not a secret. app.json clean. FINDING LEVEL: ok.
- iOS ATS hardened (NSAllowsArbitraryLoads:false). ✓

## Accessibility audit

- measured (WCAG relative luminance, node):
  - --ink2 #9AA3B8 on #211D29 = 6.53:1 → AA-normal PASS
  - --ink #EDEFF6 on #211D29 = 14.36:1 PASS
  - --ink3 #5C6678 on #211D29 = 2.85:1 FAIL (F10) — legal copy + tabs
- RTL: `<html lang="ar" dir="rtl">` present (index.html:2). ✓
- Interactive semantics: tabs/chips/fbuttons/dbtns/rtiles are native <button> elements (≥5 audited ✓); list rows are not (F32); sheet rows are non-interactive divs; no aria-live on the alert/toast surfaces (minor).

## Commands + exit codes (this session, exact so far)

| command | dir | exit | summary |
|---|---|---|---|
| python release\qa\_scripts\data_audit.py | repo | 0 | 186 entries clean: bbox/corridor/source/verified all pass |
| node --check preview\app.js | repo | 0 | syntax ok |
| node --check preview\sw.js | repo | 0 | syntax ok |
| python tools\merge.py (twice) + Get-FileHash | repo | 0 | byte-identical second run |
| npm audit --prefix app | repo | 1 | 11 moderate vulns |
| npx expo-doctor | app | 0 | 20/20 |
| npx tsc --noEmit | app | 0 | clean at baseline (see re-run F4) |
| npx expo export --platform web | app | 0 | dist\index.html exists |
| npx tsc --noEmit (after AlertEngine landed) | app | 2 | 4 type errors (F4) |
| npx tsc (engine standalone emit) | app | 2 (emitted anyway) | engine_out js for repro |
| node release\qa\_scripts\engine_corridor_harness.cjs | repo | 0 | ZERO events on a corridor drive (F5 repro) |
| npx expo prebuild --platform ios --no-install | app | 1 | skipped off-macOS; no pbxproj (F27) |
