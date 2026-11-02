# Nazra نظرة — Getting the .ipa on your phone, honestly.

A `.ipa` is a signed portable iOS binary. It can only be **produced** by a
macOS toolchain (`xcodebuild` + `codesign` + `mobilsdeviceprovision`). A phone-side
"certificate" isn't a build machine — it's one half of the signing pair. So the
output this project gives you is the **build recipe + signed pipeline**, not a
pirated pre-compiled blob. Three real routes, all from a Windows box:

| # | Route | Needs | Time | Result |
|---|---|---|---|---|
| A | **Codemagic cloud (macOS M1 runner)** | GitHub repo + Codemagic free account + Apple ID paid dev ($99/yr) | ~10 min | `nazra.ipa` → drag to Sideloadly → install directly |
| B | **EAS cloud (Expo)** | Expo Dev account (paid tier, since iOS builds are paid) + Apple paid dev | ~15 min | same .ipa output |
| C | **Local Mac / borrowed Mac** | Free Apple ID + Xcode + cable | 20 min (7-day expiry) | dev build, refresh |
| D | **Free 7-day Sideloadly route (dev cert per-app)** | iTunes + Sideloadly + Apple ID | 10 min | limited to 7 days + 3 apps / Apple ID |

If you "have a certificate on your phone" read it as: you already have an Apple
Developer account (paid). In that case **Route A (Codemagic)** is the fastest and it
auto-generates the p12 + provisioning profile for the bundle id you gave us:
`jo.nazra.app`.

## Route A — the fastest Windows-only path

1. Push this repo to GitHub (we already wired it).
2. Codemagic → **Add application from repository** → pick repo, workflow `nazra-ios-ipa`.
3. Codemagic dashboard → UserProfile → **Apple Developer** → connect App Store Connect API key
   or username/password. Codemagic auto-generates an Apple Development Certificate
   + provisioning profile for `jo.nazra.app` on first build.
4. Hit **Start build**. You get `nazra.ipa` in the artifacts tab.
5. Download the `.ipa` on the Windows PC.
6. **Sideloadly** (Windows, iTunes required) → Drag the `.ipa` in → Sign using your
   Apple ID → click Start → Sideloadly finds your iPhone via USB → installs it.
7. On the iPhone: Settings → General → VPN & Device Management → Trust your account profile.

## Route D — no Apple Dev account, still fine (7-day cycle)
- `npx expo prebuild --platform ios` on Windows → dist/ folder
- `eas build --profile preview --platform ios` … **requires an Expo paid plan for iOS** — skip if free tier.
- Practical free path: only Codemagic free tier gives you M1 macOS minutes to sign
  a universal `.ipa` for free — you still need a $99/yr Apple Developer for codesign.

## What's already wired in `/app`
- `app/eas.json` — profiles: development / preview / production.
- `app/codemagic.yaml` — the full macOS pipeline: npm ci → `expo prebuild` →
  `pod install` → `xcodebuild` → `zip` → Kafka output `nazra.ipa`.
- `app/src/theme/tokens.ts` — the RGB values and Zeizo persona/manifesto/alerts already live
  so any RN surface (Onboarding, HomeMap, AlertDialog, Paywall, RadarList, Report, Settings)
  reads Nazra the moment it renders, no screen edits needed.

## What needs your input, once
- Codemagic Apple credentials —機 your $99 Apple ID, not ours.
- Test device — your iPhone for the final Trust + drive-by.

Nothing else. One command away.
