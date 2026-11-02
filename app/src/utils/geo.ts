import type { GeoPoint } from '../types/radar';

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in km (haversine; sub-meter error at app scales). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing in degrees 0..360 (true north). */
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180) / Math.PI >= 0
    ? (Math.atan2(y, x) * 180) / Math.PI
    : (Math.atan2(y, x) * 180) / Math.PI + 360;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
