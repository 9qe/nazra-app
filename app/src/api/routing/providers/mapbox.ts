/**
 * Mapbox routing/geocoding provider — real HTTP integration over the global
 * fetch (RN 0.88 / Hermes; no new dependencies). Every code path returns a
 * typed RoutingResult; nothing throws past the method boundary. No fabricated
 * data: zero features/routes in a valid 200 is `empty_result`, never a stub.
 *
 * Endpoints (verbatim per public Mapbox spec):
 *   Geocoding v6 forward: GET https://api.mapbox.com/search/geocoding/v6/forward
 *                         params: q, proximity(lng,lat), language, limit,
 *                         access_token
 *   Directions v5:        GET
 *                         https://api.mapbox.com/directions/v5/mapbox/driving/{lngSrc},{latSrc};{lngDst},{latDst}
 *                         params: overview=full, geometries=geojson,
 *                         steps=true, alternatives=true|false, language,
 *                         optional bearings=deg,deg;deg,deg +
 *                         approaches=unrestricted;unrestricted (both only
 *                         when originBearing is provided).
 *
 * The token is never logged and never appears in any error message.
 */

import Constants from 'expo-constants';

import {
  hasMapboxCredentials,
  type PlaceHit,
  type RouteLegManeuver,
  type RouteOption,
  type RouteRequest,
  type RoutingError,
  type RoutingErrorCode,
  type RoutingProvider,
  type RoutingResult,
  type SearchQuery,
} from '../types';

const GEOCODING_FORWARD_URL = 'https://api.mapbox.com/search/geocoding/v6/forward';
const DIRECTIONS_BASE_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

/** Hard ceilings over untrusted arrays — a hostile body must never hang us. */
const MAX_HITS = 100;
const MAX_ROUTES = 3; // primary + ≤2 alternatives, per the provider contract.
const MAX_MANEUVERS_PER_ROUTE = 2000;
/** v6 forward accepted range 1..10 per request; clamp caller input. */
const GEO_LIMIT_MAX = 10;

/* ------------------------------------------------------------------ */
/* Token resolution — env first, app.json extra second.               */
/* ------------------------------------------------------------------ */

export function resolveToken(): string | undefined {
  const fromEnv =
    typeof process !== 'undefined'
      ? process.env?.EXPO_PUBLIC_MAPBOX_TOKEN
      : undefined;
  if (hasMapboxCredentials(fromEnv)) return fromEnv;

  // app.json fallback: expo extra.mapboxAccessToken (no token hardcoded here).
  const extra: unknown = Constants.expoConfig?.extra;
  if (isRecord(extra)) {
    const fromExtra = extra.mapboxAccessToken;
    if (typeof fromExtra === 'string' && hasMapboxCredentials(fromExtra)) {
      return fromExtra;
    }
  }
  return undefined;
}

/** Typed error for the no-token boundary; status null per taxonomy. */
export function credentialsError(): RoutingError {
  return {
    code: 'missing_credentials',
    status: null,
    message:
      'No Mapbox token configured (EXPO_PUBLIC_MAPBOX_TOKEN or app.json extra.mapboxAccessToken).',
  };
}

/* ------------------------------------------------------------------ */
/* Untrusted-JSON narrowing helpers — validators everywhere, no `any`. */
/* ------------------------------------------------------------------ */

type Vec2 = [number, number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function numOf(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function strOf(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function isVec2(v: unknown): v is Vec2 {
  return (
    Array.isArray(v)
    && v.length === 2
    && typeof v[0] === 'number'
    && Number.isFinite(v[0])
    && typeof v[1] === 'number'
    && Number.isFinite(v[1])
  );
}

function err(
  code: RoutingErrorCode,
  status: number | null,
  message: string,
): { ok: false; error: RoutingError } {
  return { ok: false, error: { code, status, message } };
}

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'unknown failure';
}

/* ------------------------------------------------------------------ */
/* Shared transport — status classify, JSON parse, never throw.       */
/* ------------------------------------------------------------------ */

async function requestJson(what: string, url: string): Promise<RoutingResult<unknown>> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e: unknown) {
    return err('network_error', null, `${what}: fetch failed: ${describeError(e)}`);
  }

  if (!res.ok) {
    const code: RoutingErrorCode =
      res.status === 429 ? 'rate_limited' : 'provider_error';
    return err(code, res.status, `${what}: HTTP ${res.status} from Mapbox`);
  }

  let parsed: unknown;
  try {
    parsed = (await res.json()) as unknown;
  } catch (e: unknown) {
    return err(
      'malformed_response',
      res.status,
      `${what}: HTTP 200 but body is not valid JSON: ${describeError(e)}`,
    );
  }
  return { ok: true, value: parsed };
}

/* ------------------------------------------------------------------ */
/* Geocoding v6 forward                                               */
/* ------------------------------------------------------------------ */

/** place_name minus its first segment, e.g. "Amman, Jordan" → "Jordan". */
function subtitleFromPlaceName(placeName: string): string {
  return placeName.split(', ').slice(1).join(', ');
}

function parseGeocoder(raw: unknown, status: number): RoutingResult<PlaceHit[]> {
  if (!isRecord(raw) || !Array.isArray(raw.features)) {
    return err('malformed_response', status, 'geocode: features array missing');
  }
  const features: readonly unknown[] = raw.features;
  const hits: PlaceHit[] = [];
  const end = Math.min(features.length, MAX_HITS);
  for (let i = 0; i < end; i++) {
    const f = features[i];
    if (!isRecord(f)) continue;
    const name = strOf(f.text) ?? strOf(f.name);
    if (name === null || name === '') continue;
    if (!isVec2(f.center)) continue;
    const subtitle =
      typeof f.place_name === 'string'
        ? subtitleFromPlaceName(f.place_name)
        : '';
    hits.push({
      id: strOf(f.id) ?? `hit-${i}`,
      name,
      subtitle,
      lat: f.center[1],
      lng: f.center[0],
    });
  }
  if (hits.length === 0) {
    return err('empty_result', status, 'geocode: 200 with no usable features');
  }
  return { ok: true, value: hits };
}

async function geocode(q: SearchQuery): Promise<RoutingResult<PlaceHit[]>> {
  const token = resolveToken();
  if (token === undefined) {
    return err('missing_credentials', null, credentialsError().message);
  }

  const params = new URLSearchParams({ q: q.query, access_token: token });
  if (q.near) params.set('proximity', `${q.near.lng},${q.near.lat}`);
  if (q.language) params.set('language', q.language);
  if (q.limit !== undefined) {
    const limit = Math.min(Math.max(Math.trunc(q.limit), 1), GEO_LIMIT_MAX);
    params.set('limit', String(limit));
  }

  const res = await requestJson('geocode', `${GEOCODING_FORWARD_URL}?${params.toString()}`);
  if (!res.ok) return res;
  return parseGeocoder(res.value, 200);
}

/* ------------------------------------------------------------------ */
/* Directions v5                                                      */
/* ------------------------------------------------------------------ */

function maneuverOf(stepU: unknown): RouteLegManeuver | null {
  if (!isRecord(stepU)) return null;
  const distanceM = numOf(stepU.distance);
  const maneuver = stepU.maneuver;
  if (distanceM === null || !isRecord(maneuver)) return null;
  if (!isVec2(maneuver.location)) return null;
  const type = strOf(maneuver.type) ?? '';
  const modifier = strOf(maneuver.modifier) ?? type;
  const instruction = strOf(maneuver.instruction) ?? strOf(stepU.name) ?? '';
  return { distanceM, modifier, type, instruction, lngLatOfManeuver: maneuver.location };
}

/** Flatten route.legs[].steps[]. Returns malformed_response on bad steps. */
function parseManeuvers(
  legsU: unknown,
  routeIndex: number,
  status: number,
): RoutingResult<RouteLegManeuver[]> {
  const legs = Array.isArray(legsU) ? legsU : [];
  const out: RouteLegManeuver[] = [];
  for (let li = 0; li < legs.length; li++) {
    const leg = legs[li];
    if (!isRecord(leg) || !Array.isArray(leg.steps)) continue;
    for (let si = 0; si < leg.steps.length; si++) {
      if (out.length >= MAX_MANEUVERS_PER_ROUTE) break;
      const m = maneuverOf(leg.steps[si]);
      if (m === null) {
        return err(
          'malformed_response',
          status,
          `directions: route ${routeIndex} step ${si} in leg ${li} violates the contract (distance/maneuver/location)`,
        );
      }
      out.push(m);
    }
  }
  return { ok: true, value: out };
}

/** `m` + route index + summary slug — stable, opaque, uuid-ish id. */
function routeId(summary: string, index: number): string {
  const slug = (
    summary
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24)
  );
  return `m${index}${slug ? `-${slug}` : ''}`;
}

function parseDirections(raw: unknown, status: number): RoutingResult<RouteOption[]> {
  if (!isRecord(raw) || !Array.isArray(raw.routes)) {
    return err('malformed_response', status, 'directions: routes array missing');
  }
  const routes: readonly unknown[] = raw.routes;
  if (routes.length === 0) {
    return err('empty_result', status, 'directions: 200 with zero routes — no fabricated paths');
  }

  const options: RouteOption[] = [];
  const end = Math.min(routes.length, MAX_ROUTES);
  for (let i = 0; i < end; i++) {
    const route = routes[i];
    if (!isRecord(route)) {
      return err('malformed_response', status, `directions: route ${i} is not an object`);
    }
    const durationS = numOf(route.duration);
    const distanceM = numOf(route.distance);
    if (durationS === null || distanceM === null) {
      return err(
        'malformed_response',
        status,
        `directions: route ${i} duration/distance not finite numbers`,
      );
    }
    const geometry = route.geometry;
    if (!isRecord(geometry) || !Array.isArray(geometry.coordinates)) {
      return err('malformed_response', status, `directions: route ${i} geometry missing`);
    }
    const coords: readonly unknown[] = geometry.coordinates;
    if (!coords.every(isVec2)) {
      return err('malformed_response', status, `directions: route ${i} geometry not [[lng,lat]]`);
    }
    const ring: Array<[number, number]> = [];
    for (const c of coords) {
      // `coords.every(isVec2)` above validated shape; this only re-types.
      const p = c as unknown;
      if (!isVec2(p)) continue;
      ring.push([p[0], p[1]]);
    }

    const maneuvers = parseManeuvers(route.legs, i, status);
    if (!maneuvers.ok) return maneuvers;

    const option: RouteOption = {
      id: routeId(strOf(route.summary) ?? '', i),
      summary: { distanceM, durationS, geometry: ring, maneuvers: maneuvers.value },
    };
    options.push(option);
  }
  return { ok: true, value: options };
}

async function directions(req: RouteRequest): Promise<RoutingResult<RouteOption[]>> {
  const token = resolveToken();
  if (token === undefined) {
    return err('missing_credentials', null, credentialsError().message);
  }

  const coords = `${req.origin.lng},${req.origin.lat};${req.destination.lng},${req.destination.lat}`;
  const params = new URLSearchParams({
    access_token: token,
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
    alternatives: req.alternatives ? 'true' : 'false',
  });
  if (req.language) params.set('language', req.language);
  // Bearing pass — skipped entirely when originBearing is absent.
  if (req.originBearing !== undefined) {
    const deg = ((Math.trunc(req.originBearing) % 360) + 360) % 360;
    params.set('bearings', `${deg},60;${deg},60`);
    params.set('approaches', 'unrestricted;unrestricted');
  }

  const res = await requestJson(
    'directions',
    `${DIRECTIONS_BASE_URL}/${coords}?${params.toString()}`,
  );
  if (!res.ok) return res;
  return parseDirections(res.value, 200);
}

/* ------------------------------------------------------------------ */
/* Provider object — hasCredentials computed lazily on every access.  */
/* ------------------------------------------------------------------ */

export const mapboxProvider: RoutingProvider = {
  name: 'mapbox',
  get hasCredentials(): boolean {
    return resolveToken() !== undefined;
  },
  geocode,
  directions,
};
