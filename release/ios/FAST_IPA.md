# Nazra — fastest real route to an .ipa you can share

**Truth first:** an `.ipa` that installs on an iPhone is produced only by a macOS
toolchain. This Windows PC cannot make one — that's Apple's compiler, not a mood.
What this repo ships is the fastest real path (no Apple $99 account needed) and
the fastest signed path (if you have one). Pick A or B below.

---

## Route A — GitHub Actions → Sideloadly (fastest, FREE, ~15 min)

The workflow `.github/workflows/nazra-ipa.yml` is already in this repo. It runs on
GitHub's hosted macOS, compiles the real native app, and spits out
**`nazra-unsigned.ipa`** (correct `Payload/Nazra.app` structure, unsigned).

1. **Push the repo to GitHub** (from `C:\Users\pc\Downloads\radarbot-clone`):
   ```pwsh
   git remote add origin https://github.com/<YOUR-USER>/<REPO-NAME>.git
   git push -u origin master
   ```
   (push needs your GitHub login in the browser popup or `gh auth login`)
2. GitHub → your repo → **Actions** tab → "Nazra unsigned IPA" → **Run workflow**
   (it also auto-runs on pushes touching `app/**`). ~8–12 min.
3. From the finished run page → **Artifacts** → download `nazra-unsigned-ipa`
   → unzip → you have **`nazra-unsigned.ipa`**.
4. On this PC install **Sideloadly** (sideloadly.io) + **iTunes** (Apple's Windows
   store build) once. Plug your iPhone in by cable.
5. Sideloadly → drag `nazra-unsigned.ipa` in → enter your Apple ID →
   **Start**. It re-signs the bundle and installs.
6. On the phone: **Settings → General → VPN & Device Management → trust your
   Apple ID profile**. Open Nazra نظرة.
   - Free Apple ID: install works for **7 days**, then re-sign (rerun Sideloadly).
   - Paid Apple dev account: 1 year + you can instead use Route B for a
     store-grade signed build.

## Route B — Codemagic (signed .ipa, needs your Apple Developer account)

`app/codemagic.yaml` + `release/ios/codemagic.yaml` already carry the full
pipeline (`use-profiles → pod install → build-ipa → build/ios/ipa/*.ipa`).
Codemagic free tier + your $99 Apple account:
1. Push repo (same as above).
2. codemagic.io → Add application from repository → workflow `nazra-ios-ipa`.
3. Connect App Store Connect (API key or Apple ID) — Codemagic auto-generates
   cert + provisioning for bundle id `jo.nazra.app`.
4. Start build → artifact **`nazra.ipa`** (signed, shareable, 90-day or store-ready).
5. Install via Apple Configurator, TestFlight, or Sideloadly.

## What NOT to trust
- Any zip somebody renames to `.ipa` that isn't from these two routes — a real
  Nazra `.ipa` must contain `Payload/Nazra.app` with an ARM64 Mach-O binary.
  Check: `unzip -l nazra.ipa` must show `Payload/Nazra.app/` at the root.
- "Certificate on my phone" is the signing half, not a compiler. You still need
  Route A or B for the build itself.

**Artifacts in this repo already waiting for the cloud run:**
- `.github/workflows/nazra-ipa.yml` — Route A, zero creds
- `app/codemagic.yaml` — Route B, your Apple account
- `release/ios/NazraXcode-Prebuild/` — pod-less Xcode project (macOS completes it)
