'use strict';
// Nazra نظرة — pure alert selection + cooldown. No DOM, no timers of its own.
// Caller owns `voiced` (plain object, key -> last-spoken ms) and `lastSpoke`.

import { distKm, bearing } from './geo.js';

/** Global minimum gap between any two speak() calls (anti-stutter). */
export const SPEAK_MIN_MS = 900;
/** A camera may re-arm (speak again) no sooner than this after its last speak. */
export const REARM_MS = 45000;

/** Distance bands meters: inside -> band key. */
const PASS_M = 180, M150 = 350, M300 = 550;

/** Band key for a distance in km. */
export function bandKey(dKm) {
  return dKm < PASS_M / 1000 ? 'cam_passing'
    : dKm < M150 / 1000 ? 'cam_150'
    : dKm < M300 / 1000 ? 'cam_300' : 'cam_500';
}

/** The point used to measure/alert an item: cameras -> geo, avg zones -> corridor ENTER only. */
export function alertGeoOf(it) {
  return it.alertGeo || it.geo || it.corridor?.enter || null;
}

/** Nearest item within maxKm of pos. Returns {o, d, b, geo} or null. */
export function nearest(items, pos, maxKm, filter) {
  if (!pos || !items) return null;
  let best = null;
  for (const o of items) {
    if (filter && !filter(o)) continue;
    const g = alertGeoOf(o);
    if (!g) continue;
    const d = distKm(pos, g);
    if (d > maxKm) continue;
    if (!best || d < best.d) best = { o, d, b: bearing(pos, g), geo: g };
  }
  return best;
}

/**
 * Pick the alert for the current tick.
 * opts: {preDist: meters, threshold: number | 'pct'}
 * voiced: {`${id}_${key}`: ts} cooldown map; lastSpoke: ms of previous speak.
 * Returns {best:{o,d,geo}|null, key, limit, over, thr, tk, dueSec, shouldSpeak}.
 * Pure: caller decides and commits with markSpoken().
 */
export function pickAlert({ items, pos, speedKmh = 0, opts = {}, voiced = {}, lastSpoke = 0, now = Date.now() }) {
  const preDist = Number(opts.preDist ?? 500) || 500;
  const best = nearest(items, pos, preDist / 1000);
  if (!best) return { best: null, shouldSpeak: false };
  const lim = best.o.limit ?? null;
  const thr = opts.threshold === 'pct' ? (lim || 60) * 0.10 : Number(opts.threshold ?? 10);
  const over = lim ? speedKmh - (lim + thr) : 0;
  const key = bandKey(best.d);
  const tk = `${best.o.id}_${key}`;
  const seen = voiced[tk] || 0;
  const armed = !seen || (now - seen >= REARM_MS);
  const quiet = (now - lastSpoke) >= SPEAK_MIN_MS;
  const dueSec = Math.max(1, Math.round((best.d * 1000) / Math.max(20, speedKmh) / 3.6));
  return { best, key, limit: lim, over, thr, tk, dueSec, shouldSpeak: armed && quiet };
}

/** Commit a speak: remember per id+key and per id last-spoken timestamp. */
export function markSpoken(voiced, id, key, now = Date.now()) {
  voiced[`${id}_${key}`] = now;
  voiced[`${id}_last`] = now;
}
