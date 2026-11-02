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
