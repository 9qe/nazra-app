import { RADAR_DATASET } from './radars';
import type { CameraType, MapPoint, ZonePoint } from '../types/radar';

/**
 * Flattened views over the bundled corpus for map + alerting + list screens.
 * The generated radars.ts stays a raw typed mirror of the corpus JSON;
 * derivations live here.
 */

export const DATASET_META = RADAR_DATASET.meta;

export const CAMERA_POINTS: MapPoint[] = RADAR_DATASET.cameras.map((c) => ({
  id: c.id,
  type: c.type,
  lat: c.geo[0],
  lng: c.geo[1],
  limit: c.limit,
  nameAr: c.name,
  nameEn: c.nameEn,
  operator: c.operator,
  verified: c.verified,
  source: c.source,
  added: c.added,
  confidence: c.confidence,
  evidence: c.evidence,
}));

export const ZONE_POINTS: ZonePoint[] = RADAR_DATASET.zones.map((z) => ({
  id: z.id,
  type: 'avg' as const,
  lat: z.geo[0],
  lng: z.geo[1],
  limit: z.limit,
  nameAr: z.name,
  nameEn: z.nameEn,
  enter: z.corridor?.enter ?? z.geo,
  exit: z.corridor?.exit ?? z.geo,
  lenM: z.lenM ?? 0,
  operator: z.operator,
  verified: z.verified,
  source: z.source,
  added: z.added,
}));

export const CAMERA_COUNT = CAMERA_POINTS.length;
export const ZONE_COUNT = ZONE_POINTS.length;

/** Engine-shaped views over the same corpus (AlertPoint/AlertZone). */
export const ALERT_POINTS = CAMERA_POINTS.map((p) => ({
  id: p.id,
  type: p.type,
  lat: p.lat,
  lng: p.lng,
  limitKph: p.limit,
  nameAr: p.nameAr,
  nameEn: p.nameEn,
}));

export const ALERT_ZONES = ZONE_POINTS.map((z) => ({
  id: z.id,
  enter: z.enter,
  exit: z.exit,
  lenM: z.lenM,
  limitKph: z.limit,
  nameAr: z.nameAr,
  nameEn: z.nameEn,
}));

/** Pin colors — brand tokens per task spec. */
export const TYPE_COLOR: Record<CameraType, string> = {
  avg: '#3D5AF1',
  fixed: '#F0537E',
  light: '#F5A623',
  locality: '#2FBF71',
  bump: '#8A6B3A',
};

export const TYPE_LABEL_AR: Record<CameraType, string> = {
  avg: 'متوسط السرعة',
  fixed: 'رادار ثابت',
  light: 'كاميرا إشارة',
  locality: 'ضبطة',
  bump: 'مطبّ',
};

export type TypeFilter = CameraType | 'all';

export const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'avg', label: TYPE_LABEL_AR.avg },
  { key: 'fixed', label: TYPE_LABEL_AR.fixed },
  { key: 'light', label: TYPE_LABEL_AR.light },
  { key: 'locality', label: TYPE_LABEL_AR.locality },
  { key: 'bump', label: TYPE_LABEL_AR.bump },
];

export function pointName(p: MapPoint | ZonePoint): string {
  return p.nameAr || p.nameEn || p.id;
}

/** Search haystack: names (ar/en), operator, source, type label, added date, limit. */
export function searchTextOf(p: MapPoint | ZonePoint): string {
  const label = TYPE_LABEL_AR[p.type as CameraType] ?? '';
  return [
    p.nameAr,
    p.nameEn,
    p.operator,
    p.source,
    p.added,
    label,
    p.limit != null ? String(p.limit) : '',
  ]
    .join(' ')
    .toLowerCase();
}
