# PRD — Jordan Officer (name in common usage) — Working Dense Architecture

## 1. Thesis
The Jordanian driver is being watched by a system they can't read. GAM (Greater Amman Municipality)
operates 9 average-speed corridors + 20 traffic-light cameras + 21 fixed radars inside Amman (Apr 2026);
Central Traffic runs ~2,500 CCTV kingdom-wide. Plan grows to 5,500 cameras by end-2026.
No single Jordanian-owned app lets a driver **see and respect that system**. Radarbot is multinational,
heavy, ad-bombed, slow to add new cameras (up to a year lag), and treats Jordan as low-priority backend.
Google Maps is a bell for traffic, not a dashboard for cameras. Waze reports user-sourced, not camera-curated.
**Alpha: a Jordan-first, offline-first, zero-ads-while-driving radar-awareness co-pilot, designed for the
Amman-Zarqa-Aqaba driving culture, localized to the Jordanian rules-of-road, and priced for JOD wallets.**

Core loop: get in car → app is already awake in background → co-pilot narrates the corridor
(dark-zone / avg-speed zone / light-camera / rumble) → driver 100% legal → tickets → 0 → driver
rents the last *Mukhabarat-report* (weekly "what's new on your route" street-level brief) → premium.

## 2. Core non-goals
- No jamming hardware (illegal), no "bleed the radar" claims, no hostile-laser hacks, no dark-market resale.
- No rooted-device firmware. No bypass of government systems. No data-patching of official feeds.
- No "report the police themselves" checkin race (reputational + legal hazard in Jordan).
- No "4 AM radar spikes while you flee" abuse of the data (the data we publish is only what GAM/Central 
  Traffic have in the public domain at the time of build).

## 3. Platform strategy
- **Fast install path (day 1)**: PWA — open in Safari/Chrome, "Add to Home Screen", works offline
  via service worker. Zero signing friction. Works on iPhone + Android + Amman's cracked phones.
- **Real IPA (week 3, once max brand lands)**: React Native Expo build. Local dev via
  `npx expo run:ios` on a macOS VM / macbook loan; distributed via TestFlight / paid developer account.
  **Three sideload routes documented in app/README.md** (free 7-day Sideloadly, AltStore, Paid dev).
- **Go to native only for**: iOS background location + BT wake + CarPlay + vibrations.

## 4. Architecture
### Data
- `data/jordan_cameras.json` — master corpus (source-tagged, hash-hashed per sync)
- `data/cameras/{amman,zarqa,irbid,aqaba,desert Hwy}.json` — partitions
- Sync: `SyncEngine` delta-fetches by `?since=` and route-bounding-box. Offline = last known pack - 30 days.
- Community reports live in a separate, rate-limited channel (1 report / 2 min / user / road-segment).
- Speed limits: OSM `maxspeed` where tagged; local overrides file for known street segments; user-correctable.

### App engine
- `GeoFence` — haversine + bearing friction; corridor-class camera = average-speed zone:
  it enters an entering/exiting state machine, computes average over entry → exit.
- `AlertEngine` — priority queue: avg-speed-zone > fixed > light > rumble > mobile-zone hint.
  Direction filter to remove wrong-way noise. Threshold configurable: absolute (10 kmh) or 10%,
  whichever greater. Auto-silencer when stationary.
- `AlertRunner` — platform-bound: WebAudio tones on PWA; on RN = expo-notifications + background-fetch +
  expo-av + expo-task-manager.
- `RadarList` — list/detail with public metadata (street, type, speed, operator, added-date, source) + 
  user "confirm/correct" loop → QA gate mixes back into the corpus.
- `Mukhabarat-Brief` — weekly route brief: what changed on your 5 most-driven segments.

### UI
- `MapLayer` — PWA: MapLibre-GL on web; on RN: `react-native-maps` (or Mapbox free tier).
- `SpeedDial` — dominant focal point, numbers big + audible, road-limit overlay chip.
- `AlertDialog` — color-coded, count-down, dark-mode default (night-driver factor).
- `RadarCard` fits the real GAM/Central-Traffic field names.

## 5. What's built here in this deliverable
- [x] Research corpus (`research/features.json`, `research/jordan.json`)
- [x] Brand identity JSON (`research/brand.json`)
- [x] PWA preview (`preview/index.html` + `app.css` + `app.js` + `data/*.json` + `manifest.json` + `sw.js`)
- [x] React-Native scaffold (`app/`) — Expo 54, TS, zustand, react-query, stub data + run + sideload docs
- [x] RAM: what we synthesized vs what we still need from the field
- [ ] Manufactured from real GAM/central Traffic public domain: the 212 named camera positions (we carry a skeleton)
- [ ] OSM audit of highway=speed_camera / enforcement=maxspeed in Jordan

## 6. Governance
- All camera data is presented as "reported by community / derived from public municipal publications."
  Screen "last updated" per record. Disputes resolved by "verify with official source" links.
- Do not claim to be associated with GAF's/Central Traffic/street authorities. It's an independent safety tool.
