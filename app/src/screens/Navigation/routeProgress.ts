import type { GeoPoint } from '../../types/radar';

/**
 * Pure route math for the turn-by-turn screen — no platform calls, no
 * simulation of steps (clean, verified helpers). Projection runs in a local
 * equirectangular meter frame centered on the query point; segment lengths use
 * haversine on the local sphere, so per-segment straight-line projections are
 * scaled by the true segment length.
 */

const EARTH_RADIUS_M = 6_371_008.8;
const M_PER_DEG_LAT = 111_132;

export interface RouteProjection {
  /** Meters traveled along the polyline up to the closest projection point. */
  alongM: number;
  /** Meters from the query point to the closest polyline point. */
  nearestM: number;
}

/** Haversine great-circle distance between two WGS84 points, meters. */
export function haversineM(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Project a point onto a provider-ordered [lng, lat][] polyline. Returns the
 * distance along the route to the closest segment projection plus that
 * projection's lateral offset, or null when the geometry is empty/short.
 * Total work O(n) — a civic drive is a few hundred segments, trivial.
 */
export function projectOnRoute(
  point: GeoPoint,
  geometry: ReadonlyArray<[number, number]>,
): RouteProjection | null {
  if (geometry.length < 2) return null;
  const latRad = (point.lat * Math.PI) / 180;
  const latScale = M_PER_DEG_LAT;
  const lngScale = Math.cos(latRad) * M_PER_DEG_LAT;
  // local frame: query point at origin
  const toLocal = (lat: number, lng: number) => ({
    x: (lng - point.lng) * lngScale,
    y: (lat - point.lat) * latScale,
  });
  let cumulative = 0;
  let best: RouteProjection | null = null;
  for (let i = 0; i < geometry.length - 1; i++) {
    const [lng0, lat0] = geometry[i]!;
    const [lng1, lat1] = geometry[i + 1]!;
    const a = toLocal(lat0, lng0);
    const b = toLocal(lat1, lng1);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const segLenM = haversineM({ lat: lat0, lng: lng0 }, { lat: lat1, lng: lng1 });
    // parameter of the orthogonal projection, clamped to the segment ends
    let t = 0;
    if (len2 > 0) {
      t = (-(a.x) * dx - a.y * dy) / len2; // query is (0,0) in the local frame
      t = Math.max(0, Math.min(1, t));
    }
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const nearestM = Math.sqrt(px * px + py * py);
    // straight-line projection scaled by the segment's true haversine length
    const alongM = cumulative + t * segLenM;
    if (best === null || nearestM < best.nearestM) {
      best = { alongM, nearestM };
    }
    cumulative += segLenM;
  }
  return best;
}

/** Distance traveled along the route in meters; null when geometry unusable. */
export function distanceAlongRouteM(
  point: GeoPoint,
  geometry: ReadonlyArray<[number, number]>,
): number | null {
  return projectOnRoute(point, geometry)?.alongM ?? null;
}

/** Fraction traveled, clamped to 0..1; null when the geometry can't project. */
export function progressFraction(
  point: GeoPoint,
  geometry: ReadonlyArray<[number, number]>,
  totalM: number,
): number | null {
  const along = distanceAlongRouteM(point, geometry);
  if (along === null || totalM <= 0) return null;
  return Math.min(along / totalM, 1);
}
