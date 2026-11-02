# Nazra 2.0 — Backend Architecture

**Candidate:** Supabase (PostgreSQL 15 + PostGIS 3.3 + Realtime + Auth + Edge Functions + Storage).
**Rationale to pick it initially:** cheapest credible geospatial stack for a student founder; fair free tier (500 MB DB, 5 GB egress, 50 k MAU auth, 2 projects); row-level security is native; Realtime covers the community-report feed without a separate websocket service; migrations are plain SQL we can read in review; and **nothing here requires a rewrite** if we later move to self-hosted Postgres (Supabase is "just Postgres + tools").
**Status:** architecture is specified; **no credentials exist, none are invented.** Deploying requires the owner to create the Supabase project and paste the two anon/public keys + project URL into repository secrets — documented exactly at §9, no purchase implied beyond the free tier.

---

## 1. Data model (migrations)

```sql
-- 001 core
create extension postgis;
create extension pg_trgm;

-- ===== users & identity =====
-- Decision: NO email/password in V1. Device-scoped identity only, invisible to policy
-- enforcers; upgrade later never deletes data.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  device_hash text unique not null,           -- client-side generated, sha-256, not PII
  display_name text check (char_length(display_name) <= 24),
  created_at timestamptz not null default now(),
  reputation integer not null default 0 check (reputation >= 0),
  banned_until timestamptz,
  ban_reason text
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (device_hash = current_setting('app.device_hash', true));

-- ===== cameras (mirror of the merge.py output, refreshable) =====
create table cameras (
  id text primary key,                 -- K-AM-01 style (existing scheme)
  kind text not null check (kind in ('fixed','light','locality','bump','avg')),
  geom geography(point,4326) not null,
  enter_geom geography(point,4326),    -- avg corridors
  exit_geom geography(point,4326),
  len_m integer,
  limit_kph integer,
  name_ar text not null,
  name_en text,
  operator_name text,
  verified boolean not null default false,   -- ONLY our pipeline sets true; clients have no write path
  confidence numeric(3,2) check (confidence between 0 and 1),
  sources text[] not null,
  pack_version integer not null,             -- set by nightly import; lets clients delta-fetch
  bbox geography(polygon,4326)               -- corridor extent, for radius pruning
);
create index cameras_geom_gix on cameras using gist (geom);
alter table cameras enable row level security;
create policy "read all cameras" on cameras for select using (true);
-- NO insert/update/delete policy => only service role (import pipeline) writes.

-- ===== community incident reports =====
create table reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('accident','roadwork','closure','congestion','pothole','surface','broken_down','hazard','camera_active')),
  geom geography(point,4326) not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,            -- server_clock truth; client-suggested duration is clamped per kind
  device_hash text not null references profiles(device_hash),
  note text check (char_length(note) <= 240),
  confirm_count integer not null default 0,
  reject_count integer not null default 0,
  status text not null default 'open' check (status in ('open','expired','resolved','rejected','quarantined')),
  promoted_to_camera boolean not null default false
);
create index reports_geom_gix on reports using gist (geom);
create index reports_active_gix on reports (status, expires_at);
alter table reports enable row level security;
create policy "read active reports" on reports for select using (status in ('open') and expires_at > now());
create policy "insert own report" on reports for insert with check (
  device_hash = current_setting('app.device_hash', true)
  and status = 'open'
);

-- ===== report votes (immutable log — no client-trusted counters) =====
create table report_votes (
  report_id uuid references reports(id),
  voter_device_hash text references profiles(device_hash),
  vote smallint not null check (vote in (1, -1)),
  at timestamptz not null default now(),
  primary key (report_id, voter_device_hash)   -- one vote per device per report, forever
);
alter table report_votes enable row level security;
create policy "read votes" on report_votes for select using (true);
create policy "insert own vote" on report_votes for insert
  with check (voter_device_hash = current_setting('app.device_hash', true));

-- Trips / prefs: **deliberately excluded from V1 backend** (Pillar E is local-first;
-- server sync lands in a later migration with the same patterns once a need is proven
-- and the privacy policy is updated first).
```

### Invariants enforced server-side (never client)
- `verified` on cameras: import pipeline only. A camera list row can only add **votes**, never verification.
- `confirm_count`/`reject_count`: derived via triggers from `report_votes`, so a malicious client cannot inject counters.
- Expiry: recomputed on write (`expires_at = least(client_claimed_ends, now() + max_ttl[kind])`), and swept to `expired` by `pg_cron` every 5 min.
- Jordan bbox guard: `geom` must land inside Jordan's bbox + lat/lng sanity (dup check in function, cheap).
- Duplicate detection: on insert, an existing `open` report of the same `kind` whose geo distance < 150 m and created < 20 min ago **merges** (bumps the confirm) via a trigger, instead of creating a row — gossip non-proliferation.
- Rate limiting: `profiles`-scoped sliding window (max 6 reports / 10 min / device; max 30 votes / 10 min), enforced by a function reading `reports` history for that device hash.
- Reputation: `profiles.reputation` updated by a trigger when a report gets confirmed by a *different* device (own votes don't self-boost; server hooks because it's the aggregation source of truth).

## 2. API surface (Edge Functions, thin)

| Endpoint | Auth | Method | Behavior |
|---|---|---|---|
| `/bootstrap` | device hash (header) | POST | Returns `pack_version`, bbox of client region, camera pack delta (or full when `since` = 0). One round-trip at app start. |
| `/reports/near` | device hash | GET | Active reports within radius (default 5 km, cap 25 km), sorted by severity×distance. Honors `pack_version`. |
| `/reports` | device hash | POST | insert-report with all §1 invariants. |
| `/reports/confirm` , `/reports/reject` | device hash | POST | single vote; idempotent thanks to PK; counter updated by trigger. |
| `/moderation/queue` | admin key (secret) | GET | quarantined/anomalous reports for human review. |
| `/moderation/act` | admin key | POST | resolve / quarantine / ban device. All actions are audited to an `audit_log` table (append-only). |

Nothing else. We do not build a "user accounts" system, do not sync location history, and do not implement server-side intelligence in V1 — the client AlertEngine remains the alert brain; the server is a bulletin board + corpus.

## 3. Corpus feed (no backend rewrite even when we DO have one)

The cameras table stays seeded by the **same `python tools/merge.py` pipeline** we already trust deterministically:
- Import job = nightly GitHub Action (cron) running import_osm.py + merge.py, then `psql` copying into `cameras` **only when the output sha256 differs** from the previous `pack_version` (deterministic pipeline + hash = no-op when nothing changed). This keeps the corpus a *reviewable artifact* rather than drift.
- Clients ship with the corpus bundled at build time (`gen-radars.mjs`), so "offline-first" remains true: **backend is an upgrade channel, not a dependency.**

## 4. Data contract sharing between PWA and iOS

Both clients talk to the same endpoints with identical schemas below — locked by a cross-platform test in `tests/geo_spec.mjs`-style parity mirror (JSON-schema embedded in both codebases):

```ts
// shared/contracts/report.ts — mirrored character-for-character in both preview and app
export interface RoadReport {
  id: string; kind: ReportKind; lat: number; lng: number;
  createdAt: string; expiresAt: string;
  confirmCount: number; rejectCount: number;
  status: 'open' | 'expired' | 'resolved' | 'rejected';
}
export type ReportKind =
  | 'accident' | 'roadwork' | 'closure' | 'congestion'
  | 'pothole' | 'surface' | 'broken_down' | 'hazard' | 'camera_active';
```

Voice copy additions per kind (Arabic) land in the same parity pass as camera lines — the `_voice` palette is the product's face.

## 5. Safety, abuse, and honesty invariants the backend must uphold

1. No client-supplied `verified` → server refuses.
2. No client-supplied reputation → server derived.
3. Report creation requires a plausible GPS accuracy (`accuracy_m` ≤ 100) else quarantined (not deleted — keep evidence).
4. Ban list honored at read time (per-device `banned_until`).
5. All admin actions written to `audit_log` (append-only, no delete path).
6. Stale reports expire automatically (`pg_cron`) — never presented as "current" past their truth window.
7. **No personal location history stored.** Trip history is client-local only. Reports contain a point + time, and the ESP disclaims future re-identification.

## 6. Migration file plan

```
supabase/migrations/
├─ 000_init.sql          (extensions)
├─ 001_profiles.sql
├─ 002_cameras.sql       (import pipeline shapes)
├─ 003_reports.sql       (the live MVP doc)
├─ 004_votes.sql
├─ 005_functions.sql     (dedupe, rate-limit, counter triggers, hop)
├─ 006_policies.sql      (RLS)
├─ 007_cron.sql          (expiry sweep)
└─ 008_audit.sql
```

## 7. What stays outside the backend (explicitly)

- Turn-by-turn navigation (vendor API direct from client).
- Camera `verified` value generation (our pipeline).
- GPS noise filtering (client).
- Battery/GPS tuning (client).
- AI assistant (client orchestration; optional LLM provider later).
- Storage of user movement history — **never on a server.**

## 8. Owner provisioning checklist (when we get to it)

1. Create a free Supabase project in an EU/Western-EU region (low latency to Jordan from either region: measured by the owner at deploy time, decision theirs).
2. Copy the two public anon key + project URL into repo secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
3. Provide nothing else. The `service_role` key stays in the Supabase dashboard; never enters the repo.
4. CI must refuse to build if these are absent — offline- and demo-only mode must show a truthful banner in that branch, not a crash or "connected" pretense.
