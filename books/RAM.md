# RAM — Reverse-Engineered Artifacts Map

Sources (evidence-grade, cited in `research/*.json`):
- App Store listing: apps.apple.com `id1099797635` — 4.6★ / 97K ratings
- Google Play listing: com.vialsoft.radarbot_free — 50M+ / 661K reviews / #3 top-grossing Maps&Nav
- Press: khaberni.com/news/801147, garaanews.com/article/404026, royanews.tv/news/389389,
  jonews24, addustour.com/articles/1593359
- Community: fuel-prices.eu/radar-detector-laws/jordan (fines-on-device legality), APKPure listing
- amplitude of Radarbot's own marketing pages on radarbot.com / iteration-mobile.com, App Store screenshots

## Feature-to-evidence-to-implementation map

| # | Radarbot feature (tier) | Evidence | Our PWA build | Our RN build (skeleton) |
|---|---|---|---|---|
| 1 | Passively alert on camera classes (17 types) while driving, even screen off, no nav needed | "100M+ installs" marketing; iOS listing claim | Partial — 5 classes Jordan-first, alerts in foreground + when reopened | Stubbed — GeoFence ready; needs expo-task-manager + background-fetch |
| 2 | Direction-aware suppression | "17 radar types" + user reviews | Yes — bearing-aware (avg corridors) | Placeholder in GeoFence |
| 3 | Speedometer + road limit UI | App Store screenshot #1 | Yes — big dial + limit chip | Screen stubs ready |
| 5 | Community realtime reports (jams, police, choppers) | Radarbot marketing; app store screenshots | Yes — Report tab (5 types, matches Jordan reality) | Screen stub ready |
| 7 | Avg-speed (section) camera alerts on **Airport Rd / Jordan St** | *Arab press: 9 P2P corridors live Apr-2026, GAM list* | **Yes** — corridor state machine + live avg | Placeholder |
| 9 | Configurable alert distances | Radarbot settings | Yes — 300/500/800/1500 m | Stub |
| 10 | Awareness above threshold (fixed 5 mph) — Radarbot weakness #8 | User reviews: "5 mph threshold, no % option" | **Yes, better** — absolute OR 10% (user's choice) | Stub |
| 11 | Truck/HDV mode | Radarbot RoadPro | No (Jordan-first) | No |
| 12 | BT auto-start | Radarbot flags | No — web can't | Stub (expo-ble) |
| 13 | Offline packs | Radarbot Gold | Way simpler: cache-first SW + one small JSON | Cache-first SW as PNC ready; pack compress if scale |
| 14 | Ads | Radarbot drawbacks #1,3,4,6,7 | **No ads ever**, in-PW | **No ads ever** |
| 15 | Paywall | Radarbot Gold vs RoadPro matrices | No paywall v0 | Paywall stub |
| 16 | Nav | Radarbot "3D maps" | No — we're an overlay, not a nav. This is our own thesis: let Google Maps be nav, we tell you where the cameras are. | Stub |
| 17 | Speed-limit DBs | Radarbot paid | Local + community-corrected | Stub |
| 18 | Biker vibration mode | Radarbot marketing | Partial — vibration API in browser | Stub (react-native sensor) |

## What we deliberately diverged from Radarbot (killer moves)
1. **Zero ads in motion** — Radarbot's top complaint is ad-bombing while driving. We: no ads. Ever.
2. **Smart threshold override** — absolute or proportional (10%). Radarbot hardcoded 5 mph.
3. **Jordan first** — 9 P2P corridors + 20 light cams + 21 fixed radars from GAM's April-2026 list.
   Radarbot treats Jordan as low-density backend territory and is *slow to add new cameras* (their own
   weakness #1). We live where our drivers live.
4. **Not a nav app.** Overlay co-pilot. Map is for context, not directions. Cheaper to build, easier to
   keep current, respects Google Maps as the thing Jordanians already open.
5. **Arabic-first, dialect-respectful** — not a translation of English. UI in RTL, English as short subtitle.
6. **Public-source transparency** — every record carries "last updated" and "source." Radarbot is opaque.
7. **Fixed = a fixed camera, not a mobile.** Per-type mute, per-type colors — their weakness #5.

## What we will NOT ship
- Jamming hardware, "beat the radar" claims, dark-laser hacks — legal line, and full of dry risk.
- Field-edited coordinates of law-enforcement positions that aren't officially published
  (this is the boundary that keeps us safe).
- Nothing tied to official body — independent app only.
