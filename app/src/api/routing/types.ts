import type { GeoPoint } from '../../types/radar';

/**
 * Routing provider contract — the seam every async navigation consumer
 * calls, never fetch() directly. Two implementations exist:
 *   providers/mapbox.ts   — real Mapbox Direction/Geocoding APIs (needs a
 *                           public token in app.json extra.mapboxAccessToken
 *                           or EXPO_PUBLIC_MAPBOX_TOKEN).
 *   providers/offline.ts  — explicit unavailable-provider state machine:
 *                           returns typed errors, never fabricated routes.
 *
 * Error taxonomy: every failure maps to a RoutingErrorCode so screens can
 * render a real message per case (no throw-mud, no silent nulls).
 */

export type RoutingErrorCode =
  | 'missing_credentials'   // no token configured — integration boundary
  | 'rate_limited'          // provider 429
  | 'network_error'         // fetch failed / offline
  | 'malformed_response'    // 200 but body doesn't parse / contract mismatch
  | 'empty_result'          // valid response, zero routes/hits
  | 'provider_error';       // 5xx / unexpected status

export interface RoutingError {
  code: RoutingErrorCode;
  /** HTTP status when the provider answered, else null. */
  status: number | null;
  message: string;
}

export type RoutingResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RoutingError };

export interface PlaceHit {
  /** Stable provider id (Mapbox feature id) — opaque string. */
  id: string;
  /** Primary display line (Arabic-first when the response is Arabic). */
  name: string;
  /** Secondary line — district/city. */
  subtitle: string;
  lat: number;
  lng: number;
}

export interface RouteLegManeuver {
  /** Distance to the maneuver, meters, from the leg start. */
  distanceM: number;
  /** Mapbox maneuver modifier (left/right/straight/uturn/...) or raw type. */
  modifier: string;
  /** Mapbox maneuver type (turn/depart/arrive/roundabout/...). */
  type: string;
  /** Raw instruction string from the provider — displayed as fallback copy. */
  instruction: string;
  /** Maneuver location [lng, lat] provider order. */
  lngLatOfManeuver: [number, number];
}

export interface RouteSummary {
  /** meters */
  distanceM: number;
  /** seconds */
  durationS: number;
  /** [lng, lat][] — provider-ordered polyline ring. */
  geometry: Array<[number, number]>;
  maneuvers: RouteLegManeuver[];
}

export interface RouteOption {
  id: string;
  summary: RouteSummary;
}

/** Bearings in degrees 0..360 — passing the fix heading improves routing. */
export interface SearchQuery {
  query: string;
  near?: GeoPoint;
  /** ISO language tag, e.g. 'ar' | 'en' — provider bias only, never a filter. */
  language?: 'ar' | 'en';
  limit?: number;
}

export interface RouteRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  /** Heading at origin when known, degrees 0..360. */
  originBearing?: number;
  /** Ask the provider for alternatives; keep ≤ 2 extra for UI. */
  alternatives?: boolean;
  language?: 'ar' | 'en';
}

export interface RoutingProvider {
  readonly name: string;
  readonly hasCredentials: boolean;
  geocode(q: SearchQuery): Promise<RoutingResult<PlaceHit[]>>;
  directions(req: RouteRequest): Promise<RoutingResult<RouteOption[]>>;
}

/** True when the token is present and plausibly shaped (pk.* / sk.*). */
export function hasMapboxCredentials(token: string | undefined | null): boolean {
  return typeof token === 'string' && /^(pk|sk)\./.test(token);
}
