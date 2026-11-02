# radarbot clone — React Native (Expo) scaffold

Jordan-first speed-camera / traffic-alert app skeleton. Managed Expo workspace,
TypeScript, offline-first data layer, placeholder design tokens for the brand pass.

## What's wired

| Concern | Live in |
|---|---|
| Design tokens (colors/spacing/type) | `src/theme/tokens.ts` — placeholder values, `TODO(name-brand)` markers |
| Theme context | `src/theme/ThemeProvider.tsx`, `useTheme()` |
| Navigation | `src/navigation/` — bottom tabs (5) + root stack with Onboarding gate & Paywall modal |
| State | `src/store/useAppStatus.ts` — zustand + persisted onboarding/units/settings |
| Data | `src/api/geoApi.ts` — deterministic stub layer `getRadarsNear(lat,lng,radiusKm)` |
| Query layer | `src/api/query.ts` — TanStack Query, `offlineFirst` network mode, 7-day gc |
| Permissions pod | `src/security/permissionGate.ts` — location fg/bg, notifications, network state; background-fetch/geofence stubs |
| Sample data | `src/data/stubRadars.ts` — realistic Jordanian cameras (Amman, Zarqa, Aqaba…) |
| Screens | `src/screens/{Onboarding,HomeMap,AlertDialog,Settings,RadarList,Report,Paywall}` |
| Web-preview shell | `App.tsx` renders a static shell on web; native mounts `AppShell` |

## Run

```bash
npm install
npx expo start
```

Press `i` / `a` in the terminal for an emulator, or scan the QR with **Expo Go** (or a dev client once built) — works on Windows host for Android/web, but iOS needs macOS for `run:ios`.

Android targeted: `npx expo start --android`. Web preview/export:

```bash
npx expo export --platform web   # static output in dist/
```

## iOS dev client

Xcode/macOS required unless using EAS Build:

```bash
npx expo run:ios   # needs macOS + Xcode
```

On Windows/without a Mac:

```bash
npm i -g eas-cli
eas build --profile development --platform ios   # cloud build, no Mac needed
```

### Getting the app on a physical iPhone — three legal routes

**1. Sideloadly (free, 7-day cert).** Free Apple ID → app re-signs every 7 days.

```bash
# Windows (need iTunes from apple.com — install BEFORE Sideloadly so drivers land)
# 1. Export the web/static target (optional) then produce .ipa:
npx expo export --platform ios          # emits dist/ (JS bundle only)
# 2. Build a real .ipa via EAS (ad-hoc profile):
eas build --profile preview --platform ios   # downloads your .ipa artifact
# 3. Drag the .ipa into Sideloadly with the iPhone attached → free cert, 7 days
```

Caveat: free certs expire in 7 days; re-sign and re-send after. Sideloadly uses the free Apple ID dev account, no paid membership required.

**2. AltStore (free, 7-day refresh / sideload via Mac/PC).**

```bash
# 1. Get AltServer on the PC: https://altstore.io → install AltStore on iPhone
# 2. Build the .ipa as above (eas build --profile preview --platform ios)
# 3. Drop the .ipa into AltStore; it re-signs whenever PC+phone share a Wi-Fi.
```

Caveat: requires PC-station refreshes; 3-app limit per Apple ID; skips App Store review.

**3. Paid Apple Developer + Xcode archive (production / TestFlight).**
Paid membership ($99/yr). No device re-sign limits, full provisioning, Submit to App Store via `eas submit` or Xcode organizer.

```bash
npx expo run:ios --device             # build directly to a connected iPhone (paid acct)
# or: eas build --profile production --platform ios, then
eas submit --platform ios             # App Store / TestFlight pipeline
```

## Workspace notes

- Windows host: Android + web iterate fully locally. iOS compile steps assume macOS/WSL2 or EAS cloud. No Xcode prerequisite stored in the project.
- Never edit `research/` — parallel agents own it.
- Before shipping brand, replace tokens + `TODO(name-brand)` comments only.
