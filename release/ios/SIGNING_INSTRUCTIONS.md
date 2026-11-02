# Nazra — iOS signing & build instructions (Route A: Codemagic)

> Owner: RN-native agent. Last verified: 2026-11-02.
> Reality check that governs this document: `npx expo prebuild --platform ios --no-install`
> **exits 1 on Windows** (proven in QA session F27: "Skipping generating the iOS
> native project files. Run … from macOS or Linux") — there is no local
> `ios/` project on this PC and none can be produced here. `pod install`,
> archiving, signing and `.ipa` packaging therefore happen **in the cloud**,
> on Codemagic's macOS runner. Do not try to "fix" that on Windows.

## Route A — Codemagic (primary, end to end)

1. One-time dashboard setup (app → Workflow editor):
   - Link the repo; workflow = `nazra-ios-ipa` in `app/codemagic.yaml`.
   - Link App Store Connect API key (`XCODE_ISSUER_ID` / `XCODE_KEY_ID` / `XCODE_KEY`),
     or let the "App Store Connect API key" UI block do it.
   - Add the iOS distribution certificate (p12) to `CM_CERTIFICATE` +
     `CM_CERTIFICATE_PASSWORD` and profile for `jo.nazra.app` to
     `CM_PROVISIONING_PROFILE` — or leave empty and let `xcode-project
     use-profiles` auto-generate them from the linked ASC account.
2. Dashboard → **Start build** (branch: main). The pipeline (FIXED per QA F26):
   - `npm ci` → `npx expo prebuild --platform ios --no-install` (macOS runner, works here)
   - `keychain initialize` + `keychain add-certificates` + `xcode-project use-profiles`
   - `cd ios && pod install` → `cd ..` →
     `xcode-project build-ipa --workspace ios/Nazra.xcworkspace --scheme Nazra`
   - Artifacts: `build/ios/ipa/*.ipa` — no static `xcodebuild` call, no unsigned
     product zip, no echo-stub upload step.
3. Download the `.ipa` from the build's Artifacts tab.

## Installing on the iPhone (no Mac, no UDID portal)

1. Plug the iPhone into the Windows PC with the USB cable.
2. **Sideloadly** (recommended): device code pane → drag `*.ipa` → enter your
   Apple ID → Sideloadly signs with a free provisioning profile and installs.
   7-day validity on a free Apple ID; re-sideload after expiry (or use a
   paid dev account for 90-day / ad-hoc profiles).
3. On the iPhone: **Settings → General → VPN & Device Management** → select the
   Apple ID profile → **Trust**.
4. If the first launch is blocked by App Store review ("Unable to verify app"):
   sign out of App Store in the iPhone settings and retry verification; keep
   internet on. (Free-profile installs need re-verification every ~7 days.)
5. Location: first launch asks **While Using** — grants the exact
   while-in-use-only permission set shipped in `app.json` (no Always/background).
   If it was previously denied: Settings → Privacy & Security → Location
   Services → نظرة → While Using.

## EAS fallback (only if Codemagic is unavailable)

1. Dashboard/CLI: `npx eas-cli login` (App Store Connect/Apple ID).
2. `cd app && eas build --profile preview --platform ios` and the mandatory
   first-run wizard: `eas device:register` — registering a physical iPhone
   **requires scanning the device's UDID QR from Safari on the device itself**;
   there is no Windows-side path for UDID registration without the device link.
3. `eas.json` already carries the `preview` profile (simulator/development
   `.tar.gz`, not a device `.ipa`) — change it to a distribution profile for
   TestFlight or an ad-hoc device build. Build dashboard → download `.ipa`.
4. Everything else (trust, install) identical to Route A step 3–5.
