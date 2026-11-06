'use strict';
// Nazra نظرة — routing provider. Same error taxonomy as the native app's
// app/src/api/routing/types.ts: missing_credentials / rate_limited /
// network_error / malformed_response / empty_result / provider_error.
// No fabricated routes — every failure resolves to a typed error object.

/** Top-level geocode/directions → RoutingResult result shape. */
export const ROUTING_ERRORS = Object.freeze({
  missing_credentials: 'أضف مفتاح الخرائط لإكمال البحث — نظرة ما بتنتحل شخصية ما عندك',
  rate_limited: 'الخدمة زحمة هلق — جرب بعد دقيقة',
  network_error: 'ما في شبكة — شغّل البيانات أو استنى ما تجي توصلة',
  malformed_response: 'رد مشبوه من خدمة الخرائط — جرب مرة ثانية',
  empty_result: 'ما في نتيجة — جرب كلمة غيرها',
  provider_error: 'خدمة الخرائط فيها عطل — مش مشكلتك',
});

/** Token storage key; the settings screen writes it, nothing else. */
export const MAPBOX_TOKEN_KEY = 'nz_mapbox_token';

/** True when a pk./sk.-shaped token exists in localStorage. */
export function hasMapboxToken() {
  try {
    const t = localStorage.getItem(MAPBOX_TOKEN_KEY) || '';
    return /^(pk|sk)\./.test(t);
  } catch { return false; }
}

function err(code, status = null) {
  return { ok: false, error: { code, status, message: ROUTING_ERRORS[code] } };
}

/** Shape the token once; callers just spread. */
function tok() {
  return { access_token: localStorage.getItem(MAPBOX_TOKEN_KEY) || '' };
}

/** Mapbox Geocoding v6 — turn a free-text query into PlaceHit[]. */
export async function geocode(query, { lang = 'ar', near = null, limit = 6 } = {}) {
  if (!hasMapboxToken()) return err('missing_credentials');
  const p = new URL('https://api.mapbox.com/search/geocoding/v6/forward');
  p.searchParams.set('q', query);
  p.searchParams.set('language', lang);
  p.searchParams.set('limit', String(Math.min(10, Math.max(1, limit))));
  if (near) p.searchParams.set('proximity', `${near[1]},${near[0]}`);
  p.searchParams.set(...Object.entries(tok()).flat());
  let res;
  try { res = await fetch(p); } catch { return err('network_error'); }
  if (res.status === 429) return err('rate_limited', 429);
  if (!res.ok) return err('provider_error', res.status);
  let body;
  try {
    body = await res.json();
    if (!body || !Array.isArray(body.features)) return err('malformed_response');
  } catch { return err('malformed_response'); }
  const hits = body.features
    .filter(f => Array.isArray(f.center) && f.center.length === 2)
    .map(f => ({
      id: f.id || String(f.center),
      name: f.text || f.place_name || '',
      subtitle: (f.place_name || '').split(',').slice(1).join(',').trim() || '',
      // provider order is [lng, lat] — app order is [lat, lng]
      geo: [f.center[1], f.center[0]],
    }));
  return hits.length ? { ok: true, hits } : err('empty_result');
}

/** Mapbox Directions v5 — turn origin/dest + prefered bearing into RouteOption[]. */
export async function directions(origin, dest, { bearingDeg = null, lang = 'ar' } = {}) {
  if (!hasMapboxToken()) return err('missing_credentials');
  const path = `${origin[1]},${origin[0]};${dest[1]},${dest[0]}`;
  const p = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}`);
  p.searchParams.set('alternatives', 'true');
  p.searchParams.set('overview', 'full');
  p.searchParams.set('geometries', 'geojson');
  p.searchParams.set('steps', 'true');
  p.searchParams.set('language', lang);
  if (bearingDeg != null) {
    p.searchParams.set('bearings', `${Math.round(bearingDeg)},60;${Math.round(bearingDeg)},60`);
    p.searchParams.set('approaches', 'unrestricted;unrestricted');
  }
  p.searchParams.set(...Object.entries(tok()).flat());
  let res;
  try { res = await fetch(p); } catch { return err('network_error'); }
  if (res.status === 429) return err('rate_limited', 429);
  if (!res.ok) return err('provider_error', res.status);
  let body;
  try {
    body = await res.json();
    if (!body || !Array.isArray(body.routes)) return err('malformed_response');
  } catch { return err('malformed_response'); }
  const options = body.routes.map((r, i) => ({
    id: `rt${i}-${r.distance ?? 0}`,
    distanceM: r.distance ?? 0,
    durationS: r.duration ?? 0,
    // [lng, lat] pairs — drawn straight with Leaflet's swapped API or via toLatLngs
    geometry: (r.geometry?.coordinates || []),
    // maneuvers: the driver-facing sequence
    maneuvers: (r.legs || []).flatMap(l => (l.steps || []).map(s => ({
      distanceM: s.distance,
      modifier: s.maneuver?.modifier ?? s.maneuver?.type ?? '',
      type: s.maneuver?.type ?? '',
      instruction: s.maneuver?.instruction ?? s.name ?? '',
      // provider [lng,lat] — displayed after swapping
      geo: [s.maneuver?.location?.[1], s.maneuver?.location?.[0]],
    }))).filter(m => Number.isFinite(m.geo?.[0])),
  }));
  return options.length ? { ok: true, options } : err('empty_result');
}

/** Sheet-facing meters helper — km for display, m when inside 1 km. */
export function fmtRouteDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} كم` : `${Math.round(m)} م`;
}
export function fmtRouteDur(s) {
  const min = Math.max(1, Math.round(s / 60));
  return min >= 60 ? `${Math.floor(min / 60)} سا ${min % 60} د` : `${min} د`;
}
