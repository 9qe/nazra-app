import { STUB_RADARS, STUB_LAST_SYNC, STUB_CITY_CENTER } from '../data/stubRadars';
import { bearingDeg, distanceKm } from '../utils/geo';
import type { GeoPoint, Radar, RadarProximity } from '../types/radar';

/**
 * Local API stub. Offline-first seam: every async consumer (TanStack Query,
 * background pollers, future sync worker) calls this module, not fetch().
 * Swap the implementation for a HTTP client later without touching callers.
 */

export interface RadarsNearQuery {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface RadarsNearResult {
  /** Proximity-annotated radars inside radius, sorted nearest-first. */
  radars: RadarProximity[];
  /** Deterministic ISO timestamp from the stub layer, for cache-age UI. */
  lastSyncedAt: string;
  /** Unix ms when documents were imported into the local pack. */
  packGeneratedAt: number;
}

export const STUB_PACK_GENERATED_AT = Date.parse('2026-11-01T00:00:00.000Z');

/** Deterministic proximity query over the stub dataset; no randomness, no clock. */
export async function getRadarsNear(lat: number, lng: number, radiusKm: number): Promise<RadarsNearResult> {
  const center: GeoPoint = { lat, lng };
  const radars = STUB_RADARS.filter((r) => !r.inactive)
    .map((r) => annotate(center, r))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return { radars, lastSyncedAt: STUB_LAST_SYNC, packGeneratedAt: STUB_PACK_GENERATED_AT };
}

/** Full echelon list (used by RadarList screen): includes inactive entries. */
export async function getAllRadars(): Promise<Radar[]> {
  return STUB_RADARS;
}

function annotate(center: GeoPoint, radar: Radar): RadarProximity {
  return {
    ...radar,
    distanceKm: distanceKm(center, radar),
    bearingDeg: bearingDeg(center, radar),
  };
}

/** City-center convenience query for previews and storyboards. */
export async function getRadarsNearAmman(radiusKm = 25): Promise<RadarsNearResult> {
  return getRadarsNear(STUB_CITY_CENTER.lat, STUB_CITY_CENTER.lng, radiusKm);
}
