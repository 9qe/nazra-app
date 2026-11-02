export type RadarKind = 'fixed' | 'mobile' | 'average' | 'redlight' | 'checkpoint';

export type RoadDirection = 'north' | 'south' | 'east' | 'west' | 'both';

export interface Radar {
  /** Stable server-side id, never regenerates between fetches. */
  id: string;
  kind: RadarKind;
  /** WGS84 latitude/degrees. */
  lat: number;
  /** WGS84 longitude/degrees. */
  lng: number;
  /** Posted speed limit at this camera, km/h. */
  speedLimitKph: number;
  /** Human-facing primary name, e.g. "Airport Rd — Marka fixed cam". */
  name: string;
  /** Governate label for offline grouping, e.g. "Amman". */
  governate: string;
  /** Road code the camera sits on, e.g. "40". */
  road: string;
  /** Direction the camera watches. */
  direction: RoadDirection;
  /** Last time a community confirmed this camera still active, ISO-8601. */
  lastVerifiedAt: string;
  /** Community confidence 0..1, decays without reconfirmations. */
  confidence: number;
  /** True when the camera is believed defunct/removed. */
  inactive: boolean;
}

export interface RadarProximity extends Radar {
  /** Straight-line distance from the query point, km. */
  distanceKm: number;
  /** Compass bearing from the query point toward the radar, degrees 0..360. */
  bearingDeg: number;
}

export type ReportCategory = 'radar' | 'hazard' | 'police' | 'congestion';

export type AlertSeverity = 'info' | 'warning' | 'critical';

/** A community radar/traffic report heading toward the alert feed. */
export interface TrafficReport {
  id: string;
  category: ReportCategory;
  lat: number;
  lng: number;
  speedLimitKph?: number;
  note?: string;
  severity: AlertSeverity;
  createdAt: string;
  /** Creator's device id; never personal data. */
  reporterId: string;
  /** Confirmation count used to rank feed items. */
  upvotes: number;
  expired: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/* ------------------------------------------------------------------ */
/* Merged radarbot corpus (preview/data/radars.json → bundled pack).   */
/* Types mirror the generator's JSON exactly — keep them in sync with  */
/* tools/out merge output, not hand-edited copies.                     */
/* ------------------------------------------------------------------ */

/** Point type used across the corpus + its UI layer ('avg' appears on zones only). */
export type CameraType = 'fixed' | 'avg' | 'light' | 'locality' | 'bump';

/** Raw OSM/GAM evidence tag bag; keys vary per record, values are tag-or-null. */
export type CorpusEvidence = Record<string, unknown>;

export interface CorpusCamera {
  id: string;
  type: CameraType;
  name: string;
  nameEn: string;
  /** [lat, lng] WGS84. */
  geo: [number, number];
  /** Posted limit km/h; null when unposted/unknown in source data. */
  limit: number | null;
  operator: string;
  verified: boolean;
  source: string;
  added: string;
  notes: string;
  evidence?: CorpusEvidence;
  confidence?: number;
  /** Rare: checkpoint running segments carry a corridor pair (see K-AQ-01). */
  corridor?: CorpusCorridor;
  lenM?: number;
}

/** Average-speed corridor gate pair in WGS84 [lat, lng]. */
export interface CorpusCorridor {
  enter: [number, number];
  exit: [number, number];
}

export interface CorpusZone {
  id: string;
  type: CameraType;
  name: string;
  nameEn: string;
  /** [lat, lng] WGS84 — corridor entry anchor. */
  geo: [number, number];
  limit: number | null;
  operator: string;
  verified: boolean;
  source: string;
  added: string;
  notes: string;
   corridor?: CorpusCorridor;
  /** Measured/declared segment length, meters — used for the average-speed run. */
  lenM?: number;
  confidence?: number;
}

export interface RadarDatasetMeta {
  generated: string;
  counts: { zones: number; cameras: number; by_type?: Record<string, number> };
  sources: string[];
  verified_count: number;
  note: string;
}

export interface RadarDataset {
  meta: RadarDatasetMeta;
  zones: CorpusZone[];
  cameras: CorpusCamera[];
}

/** Camera flattened for map/alerting consumption (numbers extracted from geo tuple). */
export interface MapPoint {
  id: string;
  type: CameraType;
  lat: number;
  lng: number;
  limit: number | null;
  nameAr: string;
  nameEn: string;
  operator: string;
  verified: boolean;
  source: string;
  added: string;
  confidence?: number;
  evidence?: CorpusEvidence;
}

/** Avg-corridor zone flattened for map/alerting consumption. */
export interface ZonePoint {
  id: string;
  type: 'avg';
  lat: number;
  lng: number;
  limit: number | null;
  nameAr: string;
  nameEn: string;
  enter: [number, number];
  exit: [number, number];
  lenM: number;
  operator: string;
  verified: boolean;
  source: string;
  added: string;
}
