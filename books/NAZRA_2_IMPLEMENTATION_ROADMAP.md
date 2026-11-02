# Nazra 2.0 — Implementation Roadmap & Cost Analysis

**Method:** dependencies first; every phase ends with tests, regression audit, doc update, coherent commit, exact results.
**Standing rule from the audit:** no phase starts until its predecessor's exit criteria are green.

---

## Phase 0 — Audit & Architecture (this commit)

**Deliverables (all in `books/`):**
- [x] NAZRA_2_ARCHITECTURE_AUDIT.md
- [x] MAPPING_PROVIDER_COMPARISON.md
- [x] NAZRA_2_BACKEND_ARCHITECTURE.md
- [x] NAZRA_2_PRODUCT_SPEC.md
- [x] NAZRA_2_IMPLEMENTATION_ROADMAP.md (this file)
- [x] Cost analysis (embedded §7 below)
- [x] Preserve/improve/remove/replace list (in audit §4/§3)

**Exit criteria:** the six documents exist and are referenced in README; no code changed.

---

## Phase 1 — Navigation foundation

**Goal:** driver can search a destination (Arabic first), choose a route alternative, and start a route session with real turn-by-turn.

**Build order (dependency-locked):**
1. **Hygiene first (no feature work yet)** — close audit §2/§4 debts so they don't silently rot under the new architecture:
   - CI workflow running python 28 + node spec 91 + RN corridor harness + tsc on every push.
   - Collapse `stubRadars.ts` seam into the real bundled dataset seam.
   - Fix onboarding "9 مقاطع" → read from `DATASET_META`.
   - Remove no-op `share` toggle (PWA) or implement the share sheet (decision: implement share sheet — it's the growth hook core).
   - Align `gen-radars.mjs` type allow-list with merge.py `ALL_TYPES`.
2. **Provider abstraction layer** (`app/src/nav/` and the mirrored `preview/nav/`):
   - `providers/types.ts` — the `RoutingProvider` contract from `MAPPING_PROVIDER_COMPARISON.md` §2.
   - `providers/mapboxProvider.ts` — **first implementation**, with a documented spike gate (see below).
   - `VoiceDirector` — spoken utterance builder driven by provider `steps[]`, reusing Zeizo voice lines; priority table from `NAZRA_2_PRODUCT_SPEC.md` §5.
3. **Search surfaces:** destination search combining (a) bundled corpus POI, (b) saved/recent places, (c) provider geocode — headed by a shared `resolve()` seam.
4. **Turn-by-turn session flickboard** (minimum viable):
   - Full-screen map with route-overlays, maneuver banner, ETA.
   - **Honest limits stated in-box:** voice turn-by-turn in Mapbox Nav SDK (config plugin needed). If the SDK spike fails within a 2-day budget → fallback route (Directions API + our own turn rendering on react-native-maps) and the fallback is shipped as the first pass, not declared as the real thing.
5. **Demo board:** scripted Amman↔Airport-Rd drive-through route (replacing today's straight demo walk) so navigation can be benchmarked without a real device.

**Phase-1 exit criteria (measured, not vibes):**
- Real driver search resolves 27/30 of the pre-agreed 30 Amman destination set (Arabic/English both).
- Real route fetch from provider returns for 5 route pairs (7th circle→AMIA, city↔Dead-Sea hwy, Zarqa↔Amman, Aqaba downtown, Ajloun switchbacks) with at least one alternative each.
- Turn-by-turn spoken on an actual device for a full scripted route offline in demo mode (language `ar-JO` fallback `ar`).
- Regression: all pre-existing 28 python + 91 node + 5 RN-harness + tsc stay green.
- New tests: 20 node unit tests on the provider seam (mocked + recorded fixtures), ≥6 RN tests on the nav session reducer, ≥8 on VoiceDirector utterance construction.
- Cost ledger shows 0 trips charged (free tier still).

**Explicit Phase-1 "not yet" gates (do not silently ship):** no offline vector region (Phase 7), no live traffic layer (blocked until provider contract), no CarPlay (Phase 7).

---

## Phase 2 — Camera + road intelligence integrated into navigation

**Goal:** the existing AlertEngine becomes a session-aware subsystem of navigation, and event types beyond cameras come alive client-side (the report types of §-3.4 in the audit).

**Build order:**
1. **Direction gating upgrade (audit §3-1):** fixed/light cameras only fire when `|bearing(heading→cam) - heading_fix| ≤ 45°` when speed ≥ 30 km/h. Corridor logic is unchanged. New spec cases on real Amman dual-carriageways (Airport Rd both directions).
2. **PWA parity upgrades (audit §3-2):** port RN's 60 m ring-exit hysteresis back into previews `pickAlert` (the 3 new spec tests).
3. **Event schema v2 lands client-side** (before backend):
   - `server/contracts/report.ts` (mirrored into preview) — kinds: accident, roadwork, closure, congestion, pothole, surface, broken_down, hazard.
   - Local-only report flows updated in both platform layers to emit/know the new kinds.
   - `AlertEngine` gains an event-dimension (other-than-cameras): same engine, adding an `EventsFeed` input stream of the same `RoadReport` shape; speak priorities aligned to Table §5.
4. **Report dock UI per spec §2.5** (both platforms; PWA parity pass required before Phase 3).
5. **Voice dictionary additions** (accident, roadwork, congestion, pothole, surface, broken_down) — locked char-for-char by parity test, matching `voice.jordanian`/`msa` structure.

**Phase-2 exit criteria:**
- 6 new spec-level pass categories in `tests/geo_spec.mjs` (direction gating units: ≥10 tests).
- Corridor behavior byte-identical to today's already-proven cases (0 regression).
- Both aprons speak the 6 incident types in Arabic correctly — parity test enforces exact equality.
- Report dock opens ≤ 1 tap from either platform's active-home.

---

## Phase 3 — Community backend (live reports + confirm + expiry + moderation)

**Dependency:** Supabase project created by owner (free tier). **No server-side code deploys without running the migration set.**

**Build order (per `NAZRA_2_BACKEND_ARCHITECTURE.md` §6 file plan):**
1. Migrations 000–008 in order, in one PR for review.
2. Edge functions (`bootstrap`, `reports/near`, `reports`, `reports/confirm|reject`, `moderation/*`) with the documented invariants; `service_role` key never in the repo.
3. Client `geoApi` seam upgraded to talk to the real backend **with zero change in callers** — exactly the reason `geoApi.ts` was written as a stub-friendly swap seam (audit §5 reuse list). Offline behavior: queue + retry + truthful indicator.
4. Abuse lane: rate-limits in SQL functions, ban/quarantine flow, `audit_log` write for every admin action (moderation tool = a small CLI in `tools/supabase_admin.py`, not a web dashboard — V1 keeps attack surface minimal).
5. Import pipeline lands as a scheduled GitHub Action running merge.py, then evaluating `psql` copy when `sha256(pack) != last`.

**Phase-3 exit criteria:**
- Two devices (PWA + RN) publishing and reading each other's reports on a real Supabase instance with the free tier.
- Expired reports auto-swept; `expires_at` visible to both platforms; no "ghost" report stays alive > TTL.
- Duplicate detection merges instead of spam-adding (e2e test on two reports within 60 m/5 min).
- Server refuses to set `verified` from client inputs (negative test).
- All §1–§5 invariant tests in one CI job hitting a disposable branch's staging project.

---

## Phase 4 — Jordan-specific services
**Dependency:** Phase 1–3 working with real users.
- Fuel stations (manual dataset from OSM POI tags, refreshed monthly alongside the camera corpus — no claimed live prices; if we show a price, it comes from a real feed or it says "تعديل جماعي بالجماعة").
- Parking — OSM amenity=parking tagged; avoid fake "availability" claims).
- Weather — provider-backed when a real API is chosen (Phase 4 only starts after revenue or budget; pricing in analysis §7).
- Closed-road snapshot workbook downloaded as `tools/jordan_closures.json` (public sources only; each record carries source URL; `verified:false` unless confirmed by GAM/press) — mirrors the camera-corpus provenance posture exactly.

## Phase 5 — Zizo assistant
**Dependency:** Phase 1–3 + navigation voice path proven on-device.
- §4 of `NAZRA_2_PRODUCT_SPEC.md` is the contract.
- Deterministic grammar first (no LLM dependency, no LLM bill). Optional LLM behind the same tool interface only after free-tier burn-down is understood across Phase 1–4.
- Anti-distraction rule enforced in the interaction layer, not just the docs.

## Phase 6 — Trip history + personal intelligence
- TripRecord (spec §7) is offline-only; no V1 backend sync; retention toggle + export + delete live in Profile.
- Insights stay personal-only (never a ranked leaderboard of other drivers).

## Phase 7 — Automotive & offline
- **CarPlay/Android Auto:** spike only. Requires native entitlements (Apple request form) and a separate template; budget risk; NOT claimed until it actually runs on hardware. Objective criteria: extends VoiceDirector into CarPlay's `CPVoiceControlTemplate` without changing the priority table.
- **Offline vector maps:** MapLibre/MBTiles download region for Amman (≤~60 MB), mirrored for the PWA via pbf→MBTiles offline margin only after in-app demand is proven.
- **Battery discipline:** threshold comparison between `Accuracy.High` vs `BestForNavigation` measured on a real iOS device across the same scripted route — 3 repeats each, published values in `books/PWA_TESTING.md` addendum (or rejected with a 'not measured' note if no iPhone available).

## Phase 8 — Growth & launch
- Recap cards + whatsapp share (spec §8) — fully local render, no signup gates.
- Store assets from real screenshots; PRIVACY.md/TERMS.md published; `STORE.md` copy pass translated by a human native speaker.
- Launch sequencing: Jordan beta (10 drivers - trusted, 60-min hand-delivered onboarding) → Wednesday Amman sessions → campus growth loop.

---

# §7 COST ANALYSIS (realistic, transparent)

Assumptions: MAU = Monthly Active Users; traffic = API-calls-based backend; no revenue considered in this table (a separate budget note lives below).

## 7.1 Provider costs by MAU tier

| Tier | Maps | Routing | Traffic | Notes |
|---|---|---|---|---|
| 1 000 MAU | **Free** (≤25k MAU Mobile Maps) | **Free** (≤100 MAU & ≤1k trips Nav SDK metered) → at 1k MAU: ~0.30×1k= $300 if metered per-trip tier — **mitigate: stay on 'unlimited trips' SDK tier amortization via contact sales OR stay under 100 MAU Nav SDK free by gating nav behind a waitlist** | not used | Note: the practical Phase-1-3 launch path is ≤100 Nav SDK MAU free; Mapbox v3 per-trip vs unlimited is a pricing call to be made with a live sales contact, never in code before confirming |
| 10 000 MAU | Free (≤25k) | Navigation SDK per-trip-tier ≈ $0.08×~1k trips + MAU fees ≈ **$800–3,000/month** (must be negotiated;来自于还会叠加 Directions API if we abandon Nav SDK ≈ 10k×3 trips×$2/1k = $60/mo) | +$100–300 (Mapbox Traffic Tiers, verify) | The ROI decision — per-trip vs unlimited — is a Phase-3 gate, not a Phase-1 one |
| 100 000 MAU | Free rides in Mobile SDK vector but **traffic/bind** — projected ≈$3,000+ /mo at metered pricing → requires annual commit / contact sales | $5,000–30,000 /mo at metered pricing (commits lower it) | $1,000–3,000 /mo | It is unrealistic for a student budget; before this tier, the product **must have revenue or a committed sponsor** |

## 7.2 Backend costs (Supabase)

| Tier | Cost | Covers |
|---|---|---|
| Free | **$0** | 500 MB DB, 5 GB egress, 50 k MAU auth, 2 projects, ~2 edge fns |
| Pro | $25/mo (verify) | Higher egress, realtime connections |
| Scale | $185/mo (verify) | only at ~50 k+ active users, computed when needed |

## 7.3 Summary by realistic tier

| Tier |真实的月结 (monthly all-in) | 必须系统 |
|---|---|---|
| 1 kilo | **$0–25** (Supabase free tier + no Nav SDK bill within free cap; if we exceed Nav SDK free: add ~$300 — we gate nav feature behind a waitlist or pre-warmed ads-free Waivers before charging) |
| 10 kilo | **$400–3,200/mo** | Real money. **must have: community funding story or revenue-turning plan before Tier** |
| 100 kilo | **$6,000–35,000/mo** | Unsolvable without enterprise pricing or provider switch (see MapLibre path below) |

## 7.4 Cost-escape hatches (kept in the design, per §2 of provider doc)
- **Lane B — Stripe-free OSS sovereign path:** MapLibre + OSRM/Valhalla on a $20–80/mo VPS + Map Tiling self-hosted. Loses turn-by-turn voice polish (we build it), gains zero per-MAU bills; a migration target if Mapbox pricing ever gets ahead of our revenue. The abstraction is already in place — a "second provider" PR is a week's work, not a rewrite.
- **Lane C — Waitlist for Nav (turn-by-turn):** camera alerts work for everyone free (pure client compute, costs $0 to us); turn-by-turn navigation gets a fair-use gate just above Nav SDK free cap before we escalate to paid tiers. This is the default Phase-1 strategy.
- **Apple Developer:** $99/yr — required for TestFlight/store distribution; NOT for sideload route (current reality).
- **Total Phase 0–3 real cash cost at current scale: $0.**

## 7.5 What requires paid services or credentials (explicit)
| Item | Cost | Needed by/when |
|---|---|---|
| Apple Developer | $99/yr | Store listing / TestFlight |
| Signed .ipa | $0 (needs owner's 4 secrets; not $) | Whenever the owner wants it |
| Mapbox beyond free | $0 until >25 k MAU Maps or >100 MAU Nav SDK | Phase 3+ (or gate feature accordingly) |
| Google Maps Platform | $0 credit; plans from $100/mo | Only if we need their POI/traffic |
| LLM (optional Zizo anytime) | $5–50+/mo by Model | Only Phase 5b if enabled |
| Push | $0 via Expo Push free tier | Phase 3 |
| Domain + privacy page | ~$10/yr | Before store submission |

---

# §8 Definition of done (cross-referenced with user spec §12)

The Phase-8 launcher isn't "done" until:
- [ ] PWA navigation + alerts work against the backend (or backend absent truthful mode).
- [ ] Native iOS navigation + corridor alerts work in a real device drive session (owner's iPhone, real roads). **Gated; if unavailable, ship with phone-testing marked NOT DONE in release notes — no fabrication.**
- [ ] Signed .ipa produced (if $/credentials available) OR unsigned .ipa launched with Sideloadly instructions (current standing deliverable).
- [ ] 28 python + 91 node + ≥40 new tests green in CI (including cross-platform parity tests).
- [ ] `tsc --noEmit` zero errors; `expo export --platform web` succeeds for PWA parity build.
- [ ] PRIVACY.md + TERMS.md no-longer-DRAFT and published (GitHub Pages) before any store submission.
- [ ] Battery + GPS noise + offline behavior checklists documented with actual measured values on real roads (or explicitly marked "not measured — needs device").
- [ ] Cost ledger available in-app for the student founder to audit burn.
