# Routing — Mapbox integration

Local (PowerShell): `$env:EXPO_PUBLIC_MAPBOX_TOKEN = 'pk.eyJ1…'` before `npx expo start` (`setx` to persist).
CI (GitHub Actions IPA workflow): reference the real secret via the `MAPBOX_TOKEN` placeholder — in the build step add:
`env:` → `EXPO_PUBLIC_MAPBOX_TOKEN: ${{ secrets.MAPBOX_TOKEN }}`.
Also supported: `app.json` → `expo.extra.mapboxAccessToken`.
No token wired → `providers/offline.ts` answers `missing_credentials`; tokens are never logged or committed.
