'use strict';
// Nazra نظرة — pure geo/corridor math. No DOM, no Leaflet, no state.
// Everything takes plain arrays [lat,lng] or route points {lat,lng,t(ms)}.

const R = Math.PI / 180;

/** Great-circle distance in km between [lat,lng] pairs. */
export function distKm(a, b) {
  const dLat = (b[0] - a[0]) * R, dLng = (b[1] - a[1]) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Initial bearing in degrees (0=N, 90=E) from a to b. */
export function bearing(a, b) {
  const y = Math.sin((b[1] - a[1]) * R) * Math.cos(b[0] * R);
  const x = Math.cos(a[0] * R) * Math.sin(b[0] * R) - Math.sin(a[0] * R) * Math.cos(b[0] * R) * Math.cos((b[1] - a[1]) * R);
  return (Math.atan2(y, x) / R + 360) % 360;
}

/** Meters travelled straight-line from a to b. */
export function distanceAlongM(a, b) {
  return distKm(a, b) * 1000;
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Average speed over a route: km of path / seconds. Points are {lat,lng,t(ms)}.
 * Returns 0 when the sample is too short (<2 points or dt<=3s) — same rule the
 * corridor engine has always used, so a 1-tick GPS jitter can't produce inf.
 */
export function avgSpeedKmH(points) {
  if (!points || points.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < points.length; i++) {
    km += distKm([points[i - 1].lat, points[i - 1].lng], [points[i].lat, points[i].lng]);
  }
  const dt = (points[points.length - 1].t - points[0].t) / 1000;
  return dt > 3 ? (km * 3600) / dt : 0;
}

/** Append a route point, hard-capping the array at `cap` (oldest dropped). Mutates route. */
export function pushRoutePoint(route, p, cap = 400) {
  route.push(p);
  while (route.length > cap) route.shift();
  return route;
}
