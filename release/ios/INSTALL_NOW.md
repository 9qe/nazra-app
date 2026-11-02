# Install Nazra on your iPhone — 2 minutes, no Apple account needed beyond your ID

**This repo's `.ipa` is produced by `.github/workflows/nazra-ipa.yml` on GitHub's
macOS runner and lands in the run Artifacts as `nazra-unsigned-ipa`.**

1. Download the artifact (needs to be logged into GitHub):
   `https://github.com/9qe/nazra-app/actions` → latest green run → Artifacts
   → `nazra-unsigned-ipa` → unzip → **`nazra-unsigned.ipa`**.

   or CLI: `cd ~/Downloads; gh run download <run-id> --repo 9qe/nazra-app`

2. Install **Sideloadly** (https://sideloadly.io) + **iTunes** from the
   Microsoft Store (driver for cable connection) — one time only.

3. Plug the iPhone in by cable. Sideloadly → drag `nazra-unsigned.ipa` →
   enter your Apple ID → **Start**. It signs with Sideloadly and installs.

4. On the phone: Settings → General → VPN & Device Management →
   Developer App → **Trust** ("Nazra").  Nazra نظرة opens.

Free Apple ID = 7-day cycle (re-run Sideloadly once a week). Paid Apple
Developer = use Route B (`app/codemagic.yaml` or the signed variant of
`nazra-ipa.yml` with `APPLE_P12`/`P12_PASSWORD`/`APPLE_PROVISIONING_PROFILE`/
`TEAM_ID` secrets, ad-hoc method, UDID added to the profile) for a 1-year signed
`.ipa`, install via Apple Configurator (Mac) or Sideloadly (Windows, same as
above).
