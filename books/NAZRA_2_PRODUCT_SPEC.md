# Nazra 2.0 — Product Specification

**Positioning:** Jordan's intelligent driving platform.
**Tagline:** من أول الطريق لآخره.
**Standard:** the most useful, trustworthy, polished driving app for Jordan — not the most features.
**Brand constants (unchanged):** Nazra نظرة palette in `app/src/theme/tokens.ts`; Zeizo as voice; while-in-use location; no ads while driving; GPS speeds informational; no fabricated data of any kind.

---

## 1. Primary navigation (4 tabs + map overlays)

```
┌──────────┬──────────────┬──────────────┬────────────────┐
│ نبّه →  │  البحث/الوجهة │   الطريق     │    رحلاتي      │
│ Navigate │  (search)    │  Live Road   │     Trips      │
└──────────┴──────────────┴──────────────┴────────────────┘
        Profile = top-right avatar (sheet, like About today)
```
- This replaces today's 5-tab layout `نظرة / تنبيهات / الكاميرات / بلاغ / إعدادات`.
- Migration mapping (nothing silently deleted): `تنبيهات` → merged into Live Road feed card style; `الكاميرات` → becomes the Camera corpus inside Live Road's filtered view; `بلاغ` → one-tap report dock inside the map; `إعدادات` → Profile.
- The map is the permanent background of tabs 1–3 (not a separate screen) so the driver's eye never relearns a layout; Trip history introduces a list-pane over the same map on tab 4.

## 2. Screen-by-screen inventory

### 2.1 Navigate (tab 1) — the "get me there" surface
- Destination search bar (top, full-width) — active Arabic + English resolver.
  - Suggestions: (a) Saved places, (b) Recent destinations, (c) our own corpus POI (cameras/zones/city landmarks) — always works offline, (d) provider geocoding — online only.
- Map with camera pins + corridor polylines + community reports (same as today's HomeMap).
- On destination chosen: alternatives carousel (up to 3), each with ETA delta and distance; "quickest / shortest" labels.
- Route overview strip: total ETA + distance-multi flags (⧗ 0 avgs ahead ⇢ شوف الطريق قبل ما تبني).
- Start → **turn-by-turn** full-screen map with next-maneuver lane, distance to next instruction, ETA in-line; camera/hazard/road-voice overlay as before — **alerts on top of nav voice with explicit priority table (§5)**.
- Zizo cooldown lock-out: while driving at speed, manual text input into search is blocked with a spoken hint (`مش وقت الكتابة يا زلمة — ثبّت وجهتك قبل ما تحرك`). Voice search (Pillar D phase) is the safe replacement, not social feeding.
- Route preference chips: أسرع / أقصر / تجنب الاشارات (unsupported at provider level = chip disabled and honest tooltip, never a fake toggle).

### 2.2 Live Road (tab 2)
- Vertical feed of active items around me (within 20 km, cap 50 rows):
  - Camera corpus (fixed/light/avg/locality/bump), hazard reports from the community, roadworks/closures (originated either from community or — later — verified official sources).
- Every entry carries: type icon, distance/ETA, `verified` chip (cam) or `confirm_count` chip (community), "منذ X دقايق".
- Actions: confirm / reject (community items), report nearby (pre-opens report dock with current GPS), filter chips.
- Cold-start truth: when no community reports exist, the app says so honestly — "بلاغات الجماعة وصلتش للمنطقة ألف الله" — never a seeded fake feed.

### 2.3 Trips (tab 4)
- Trip records (per §7): distance, duration, start/end (coarse neighborhood, not exact address), top speed, avg speed, corridor passes, alerts encountered, "clean passes" (passed a corridor within limit).
- Weekly/monthly insight cards (safe gamification, never speed-shaming: "أنت ٩٥٪ نظيف بديمع السرعة" — verifies only against *your own* base, never social ranking).
- Shareable "بطيخة" recap cards (growth hook in §8).
- Saved routes: frequent route shortcuts home/work/school.

### 2.4 Profile (sheet, top-right)
- Settings (existing rows + new: navigation voice mute, report default duration)
- Privacy: trip retention (off / 30 d / forever), export JSON, delete all (local-first privacy posture — the app takes zero location history to any server, period).
- Reputation (from backend Pillar C) and contribution history.
- Zizo customization (voice pack MSA/Jordanian already supported).
- Help + About (unchanged).
- Developer: offline region downloader (Phase 7) and cost ledger (Diag → provider usage).

### 2.5 Report dock (component, on tabs 1 & 2)
- Explicit one-tap grid (pins and driving-safe): accident 🚨, roadwork 🚧, closure ⛔, congestion 🚶‍♂️🚶‍♂️, hazard ⚠️, pothole 🕳️, surface 🛞, broken-down 🚗, camera active 📸.
- Big card-tap targets (≥56 pt), zero typing required by default. Voice `note` optional later.
- On submit: speak `report_thanks`-style line, animate pin onto map — no fake "submitted to server" if the submission is offline-queued; the queue indicator is honest ("بالانتظار — راح يروح لما نرجع أونلاين").

## 3. User flows (happy paths)

**F1 First-run:** launch → onboarding (identity + GPS rationale + honest `verified:false` chip for data) → Location granted → auto-position → default view = Live Road with local corpus. If GPS denied → demo corpora + explicit "ديمو" ethereal banner.

**F2 Discover destination & navigate:**
1. Type/pick destination → 2. Alternatives → 3. Start → 4. guidance + overlays → 5. arrival toast `وصلت 🧿`. Re-route on 2 consecutive off-route fixes with distance > threshold; spoken "مغير مسار يا زلمة".

**F3 Report (safe while driving):**
1. See something → 2. tap dock, tap type (one tap) → 3. confetti-free pin + spoken thanks → 4. server insert (or local queue if offline) → 5. approaching drivers get it in their Live Road + map + voice.

**F4 Corridor:**
1. Enter: voice prompt +êtes-progress strip on-screen → 2. passing point → 3. exit verdict (avg/limit) — same behavior as today, now drawn as an on-route overlay instead of radial proximity when navigation is active.

**F5 Cold-start Amman (be specific, not hand-wavy):**
- **No anonymous community magic.** Nazra launches with:
  1. The 177-camera + 10-zone corpus — real on day one from press-verified lists.
  2. The demo of all features (drive-along plunderable route).
  3. A strategic seeding plan (from `books/GROWTH.md`) with named Jordan-area "champions" approached individually; a report is only shown on the public feed once ≥1 *other* device has confirmed it, so launch data quality is never a single bad actor's imagination.
- Badge: 'ناصح' — awarded for contribution accuracy at 10 verified reports, shown in Profile.

## 4. Voice & Zizo spec (Pillar D, phased)

- **Phase 5a (deterministic, no LLM):** fixed command grammar.
  - "زيزو، وديني <place>" → resolve against corpus + provider
  - "زيزو، تجنب" → toggles alternatives
  - "زيزو، كم باقي؟" → ETA delta
  - "زيزو، طفي/شغل الصوت" → mute/unmute
  - "زيزو، بلاغ حادث" → pre-armed report dock set to accident
  - "زيزو، وقف المسار" → cancel
- Command set ships **disabled by default** in the PWA (needs `wake word` 'زيزو' as literal match in the Web Speech transcript, imperfect on web) and **on** in iOS (expo-speech-to-text + push queue).
- **Anti-distraction rule:** Zizo speaks; Zizo never opens a keyboard mid-drive. Screen interactions during `driving = speed > 20 km/h for >3 s` revert to spoken confirmations only.
- **Phase 5b (optional, do not block on it):** an LLM-backed handler behind the same `assistant Tools` interface. Costs real money — **only** enable after Pillars A–C are proven and free-tier budget is stable. Tool list stays the same: resolve/route/dive-report/ETA/summary — nothing else is ever allowed to touch the device.

## 5. Audio priority table (safety first)

| Priority | Source | Behavior |
|---|---|---|
| 1 | Hazard/collision warning (corridor exit_bad) | interrupts nav voice |
| 2 | Camera close (cam_150 / cam_passing) | interrupts nav voice if within 150 m |
| 3 | Nav instruction | always audible |
| 4 | Zizo answer / report confirmation | only when not interrupting 1–3 |
| 5 | Trivia / tips | only when parked |

Rule: **never two voices in one second**; queue with priority; a spoken utterance can be cancelled and immediately re-taken only by priority 1.

## 6. Non-negotiable honesty rules reflected in this spec

- No fake alter/paperclip test traffic indicator. No congestion layer without a real provider.
- No fake "verified" chip on community reports (they say "بلاغ جماعة" with confirm count).
- Empty states say "بلاغات الجماعة وصلتش للمنطقة بعد" — never seeded fake posts.
- Demo mode always announces itself ("ديمو").
- Corridor verdict is informational — wording stays neutral in Arabic (`القياس فقط؛ لا يمثل تقريراً رسمياً`).

## 7. Trip record schema (local-first; no server sync in V1)

```ts
interface TripRecord {
  id: string; startedAt: number; endedAt: number;
  distanceKm: number; maxKph: number; avgKph: number;
  zonesPassed: string[]; alertsHeard: number;
  // coarse only: never store more than the city/neighborhood grid the driver saw on screen
  startZone: string; endZone: string;
  cleanCorridors: number;
}
// Stored: AsyncStorage (RN) / IndexedDB (PWA). Server: NEVER.
// Retention options in Profile: off / 30d / forever; default 30d.
```

## 8. Growth mechanics (built in, not bolted on)

- **بطيخة recap card:** after a trip with ≥1 clean corridor pass, offer a stylized card (pure local render) — "بديمع السرعة ٩٥٪ نظيف اليوم 🧿" — with a share sheet (WhatsApp first; Nazra's most-used outbound).
- **Referral:** tray-free — every recap card carries the app URL; no signup wall, no paid mechanic.
- **Nasih badge:** honest reward for accurate reports; the app turns "helping the community" into social status without user counts shown publicly beyond organic share.
- No advertising, no dark patterns, no paid-per-share faucets.

## 9. What we are explicitly NOT shipping in 2.0

- No fake CarPlay/Android Auto mock screens.
- No paid tier (monetization discussion delayed until product-market fit; Bootstrap Tier uses zero-cost, keep user trust).
- No LLM orchestration past what §4 allows (no open-domain chat).
- No server-side tracking of user location (§7).
- No leaderboard of other users' speeds (safety: rewards slow+clean, never fast).
