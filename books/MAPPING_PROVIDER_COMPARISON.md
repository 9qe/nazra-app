# Nazra 2.0 — MAPPING / ROUTING PROVIDER COMPARISON

**Date:** 2026-11-02 · **Verdict footer:** recommended path + evidence basis.
**Status note:** prices verified live this session from mapbox.com/pricing and mapsplatform.google.com/pricing; others cited from published tier docs and flagged "verify before sign-up." Nothing here is a purchase decision — Phase 1 starts only after the spike test below passes.

---

## 1. Candidates evaluated

| Provider | Openness | Turn-by-turn SDK | Arabic/geocoding | Traffic data | Offline maps | RN compatibility | Cost@1k MAU | Cost@10k MAU | Cost@100k MAU | Lock-in |
|---|---|---|---|---|---|---|---|---|---|---|
| **Mapbox** | SaaS, proprietary on top of OSM | Native iOS/Android SDKs, mature | Good globally; streets in Jordan covered; Arabic names from OSM | Yes (proprietary, sellable add-on) | Yes (vector tile packs) | Good — `@rnmapbox/maps` is the de-facto RN vector-map binding; Navigation SDK requires native config-plugin work | **$0** (≤25k Mobile Maps MAU; Nav SDK free ≤100 MAU & ≤1k trips) | ~$0.30/MAU + $0.08/trip on metered plan ≈ $3,000+/mo | Volume tiers / annual commit (negotiated) | Medium — OSM-derived, but SDKs proprietary |
| **Google Maps Platform** | SaaS | Navigation SDK (commercial, strong UI) | Best-in-class POI + Arabic | Best available globally | Yes | Official `@react-navigation`? no — Google offers RN SDK bindings; heavier setup | 0 (Free tier $200 credit) | Subscription tiers: Starter $100/50k, Essentials $275/100k calls | Pro $1,200/250k + Enterprise | High — ToS restricts navigation storage/caching |
| **HERE** | SaaS | Good | Good | Excellent | Yes | Weakest RN story (new SDK, thinner bindings) | Freemium 250k tx/mo (verify) | ~$0.002/tx + subscriptions (verify) | Volume (verify) | High |
| **OSRM (self-host)** | OSS (ODbL) | **No SDK** — you build UI on top of Directions JSON | As good as OSM tagging; Arabic shaky | **No live traffic** | Via map data you tile yourself | Any — JSON over HTTP; fits react-native-maps/MapLibre easily | VPS $10–20/mo (Jordan extract is tiny) | Same + second VPS | ~$50–100/mo infra | **None** |
| **Valhalla (self-host)** | OSS (BSD) | No SDK — has Valhalla "meili" map-matching | Same as OSRM | No live traffic | Tile-source aware (can rebake tiles) | Same as OSRM | $10–20/mo | ~$30/mo | ~$80/mo | **None** |
| **GraphHopper** | OSS + SaaS | SaaS offers Directions API; self-host available | Good (OSM-based) | Premium add-on | Premium | JSON API | Free SaaS tier (limited); self-host on VPS | Paid tiers from ~$500/mo (verify) | Enterprise | SaaS = high; self-host = none |
| **MapLibre + self-tiles + OSRM/Valhalla** | **Fully open** | UI you build | OSM | No traffic | Excellent (tile MBTiles) | `@maplibre/maplibre-react-native` works with Expo prebuild | VPS only | ~$50/mo | ~$150/mo | **None** — full data sovereignty |

**Reading the table:** the honest load-bearing rows are Mapbox, Google, and the fully-open MapLibre+OSRM/Valhalla stack. HERE and GraphHopper have no feature that beats Mapbox for this project's Phase-1 needs and both cost more.

---

## 2. Provider-abstraction contract (what we build regardless)

To avoid being married to any of the above, Phase 1 ships a `providers/routing` seam with three concrete methods and one event stream:

```
interface RoutingProvider {
  resolve(query: string, near: GeoPoint): Promise<Place[]>;        // search/geocode
  route(from: GeoPoint, to: GeoPoint, opts: RouteOpts): Promise<Route[]>; // with alternatives
  subscribe(session: Route): NavStream;  // turn-by-turn events + distance/eta updates + reroute
}
interface RouteOpts { avoid?: avoidKind[]; alternatives?: number; units: 'km' | 'mi' }
```

- **Voice instructions** are our own utterances built from the provider's `steps[]` types — so switching providers does not change spoken UX.
- **Camera/hazard overlay** (Pillar B) is drawn independently of the provider — never inside the vendor's nav canvas only.
- **Map canvas** is also behind a seam: `MapCanvas` abstraction (Apple Maps today via react-native-maps, MapLibre/Mapbox tomorrow). Palette + tokens keep styling consistent.
- **Cost guard:** every call counted through one `UsageLedger` per provider (logged locally, exported in diagnostics) so MAU/tier burn-down is visible in Settings → Diagnostics.

## 3. Jordan-specific testing matrix (the spike)

Before any code ships, a 60-minute bench test on real data:

1. Geocode 30 real Amman destinations (Dabouq Roundabout, 7th Circle, Abdali, Sweifieh, Mecca Street GATE, Al Hussein Cultural Center, Zarqa Zmtah, and 23 more including a residential neighborhood name like "Um Uthaina") in **Arabic** — success bar: top-1 hit correct ≥80% Arabic + ≥85% English.
2. Route downtown ↔ Airport Rd (7th circle ↔ AMIA) + downtown ↔ Dead-Sea Rd in the 5 pm slot — compare ETA vs reality and route alternatives count.
3. Route with a deliberate avoidance + a re-route after an off-route event on a real device while driving (passenger only).
4. Verify tile rendering in Amman urban + Ajloun mountain switchbacks at speed; check turn-by-turn spoken intervals in a 70 kmh zone.
5. Verify offline behavior with airplane mode on the cached region test.

**Success bar per stage = the same function working end-to-end in a feature-flagged RN build.** No provider is "chosen" until this matrix passes at least once.

### Vendor conclusions by rod we actually hit

- Mapbox Mobile Maps SDK **free tier = 25 000 MAU** (pricing table read today). Navigation SDK per-trip metered free tier = **100 MAU + 1,000 trips** before $0.30/MAU + $0.08/trip (checked today). **Given Nazra's user base is currently ~0 to hundreds, Phase 1–3 pilots fit entirely inside free tiers.**
- Google Maps Platform now bills via subscription plans; **Starter $100/mo = 50k calls**, Essentials $275/mo = 100k calls, Pro $1,200/mo = 250k calls (read live today). **Meaningful only if/when we need Google's POI and traffic quality.**
- MapLibre + OSRM/Valhalla: no metered cost, no travel-time earned traffic file beyond community reports, and **no SDK turn-by-turn** — we build the UI. Best long-term sovereignty path once the product has revenue.

---

## 4. Decision

**Build the abstraction. Implement first against Mapbox (Maps SDK + Directions API + Navigation SDK v3 as three tiers that can be swapped independently).**

Reason, in order:
1. **Cost reality:** every Phase 1–3 experiment is inside free levels → zero dollars spent while the product is validated.
2. **Compatibility:** `@rnmapbox/maps` + a config-plugin (we already run a successful managed prebuild in `.github/workflows/nazra-ipa.yml`, the hard part of native config is proven) → highest chance of landing real turn-by-turn voice guidance without forking Expo.
3. **Data quality:** OSM-derived street graph is directly comparable and cross-checkable with the corpus we ourselves source (origin — OSM) — same assumption set.
4. **Attribution cost:** manageable, unlike Google's stricter navigation-storage ToS.
5. **Exit path lives in the design:** because the voice + camera + hazard layers are independent of the provider, and the `RoutingProvider` interface is the seam — the same code runs on OSS (MapLibre + OSRM) via a second provider implementation "openProvider" with zero UI rewrite. This is our negotiated-cost weapon later.

Google's Navigation SDK is explicitly kept on the bench as the fallback for one specific weakness (if Mapbox's turn-by-turn voice cannot carry Arabic `ar-JO` utterance properly in the packaged SDK), and HERE is dismissed for RN-binding weakness.

## 5. Attribution and compliance obligations (embedded, not optional)

- Mapbox: in-app attribution + ToS-required link on About/Diagnostics + written data-transform notice. Enforced in the `About` screen template.
- OSM/OSRM-derived corpus = ODbL attribution for our public data file (mirrors OSM notice).
- No map provider assets/copied tiles under a restrictive ToS. Tiles cached only via the provider's own SDK mechanisms.
- Carto tiles (PWA today): keep; their Basemaps free tier requires attribution + non-commercial — **keep for PWA preview; production PWA timeline flagged in roadmap**, or switch PWA to the same Mapbox/MapLibre stack as native if traffic grows (also unifies branding).

## 6. What "done" looks like for Phase 1

- [ ] Real destination search (Arabic + English) returning correct top hits on the 30-case matrix.
- [ ] Real route display with at least 1 alternative on Airport Rd & Amman ↔ Dead-Sea routes.
- [ ] Real simulated turn-by-turn on the Aqaba–Amman "O" drive in demo mode (offline demo boards with scripted route).
- [ ] Camera + hazard pins/voice fire **on top of** an active navigation session, with correct priority.
- [ ] `books/MAPPING_PROVIDER_COMPARISON.md` (this file) referenced from README as the provider rationale.
- [ ] Cost ledger visible in Settings, tagged "Navigation provider" and showing free-tier burn.
