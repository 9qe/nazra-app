import { distanceKm } from '../utils/geo';
import type { CameraType, GeoPoint } from '../types/radar';

/**
 * Corridor + camera alert engine — pure TS, no UI/React imports (mirrors the
 * PWA's alert contract). Feed it a location stream; it emits discrete events:
 *
 *   cam_500 / cam_300 / cam_150  — outer rings as the user closes on a camera
 *   cam_passing                  — within passing radius of the camera
 *   zone_enter                   — crossed the corridor ENTER gate (180 m)
 *   zone_exit_ok / zone_exit_bad — crossed the EXIT gate (220 m); verdict =
 *                                  accumulated path km / elapsed seconds
 *
 * Gate radii follow the PWA engine exactly (preview/app.js: enter <0.18 km,
 * exit <0.22 km). The corridor average is accumulated haversine path length
 * over elapsed time (PWA lib/geo.js avgSpeedKmH): km*3600/dt with the same
 * dt<=3 s -> 0 rule, so a sub-second GPS jitter can never produce inf.
 *
 * Re-arm: same point+key may re-fire only after REARM_MS (45 s default) —
 * handles U-turns and stop-and-go without spamming. A global MIN_INTERVAL_MS
 * (900 ms default) gates CAMERA emissions only; corridor verdicts always
 * emit (PWA shows the verdict toast regardless of the speech throttle).
 *
 * Key names (cam_500 etc.) are PWA-contract labels, not literal radii: when
 * preDist is reconfigured the radii scale, the keys stay stable so the voice
 * dictionaries keep resolving.
 *
 * Geo math: same canonical forms as src/utils/geo.ts (haversine, atan2
 * bearing, mean Earth radius ~6371 km — sub-meter error at these scales).
 */

export type AlertKey =
  | 'cam_500'
  | 'cam_300'
  | 'cam_150'
  | 'cam_passing'
  | 'zone_enter'
  | 'zone_exit_ok'
  | 'zone_exit_bad';

export interface AlertPoint {
  id: string;
  type: CameraType;
  lat: number;
  lng: number;
  limitKph: number | null;
  nameAr: string;
  nameEn: string;
}

export interface AlertZone {
  id: string;
  enter: [number, number];
  exit: [number, number];
  lenM: number;
  limitKph: number | null;
  nameAr: string;
  nameEn: string;
}

export interface AlertEvent {
  uid: string;
  key: AlertKey;
  pointId: string;
  /** 'zone' marks corridor events; otherwise the corpus camera type. */
  pointType: CameraType | 'zone';
  /** Distance from the emitting fix to the point, meters. */
  distM: number;
  /** true/false only when a limit AND a speed were both measurable. */
  over: boolean | null;
  speedKph: number | null;
  limitKph: number | null;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
  atMs: number;
  /** corridor exits: measured average speed over the segment, km/h. */
  avgSpeedKph?: number;
  segmentLenM?: number;
  elapsedSec?: number;
}

export interface ThresholdCfg {
  mode: 'abs' | 'pct';
  /** absolute grace over the limit, km/h (mode 'abs'). */
  absKph: number;
  /** percent grace over the limit (mode 'pct'), e.g. 15 → limit × 1.15. */
  pct: number;
}

export interface AlertEngineOptions {
  /** Per point+key re-arm window, ms (default 45 000). */
  rearmMs?: number;
  /** Global minimum gap between two CAMERA emissions, ms (default 900). */
  minIntervalMs?: number;
  /** Camera rings, meters, descending. Defaults [500, 300, 150]. */
  camRadiiM?: [number, number, number];
  /** Passing radius, meters (default 60). */
  passingRadiusM?: number;
  /** Corridor ENTER gate radius, meters (default 180 — PWA spec 0.18 km). */
  zoneEnterRadiusM?: number;
  /** Corridor EXIT gate radius, meters (default 220 — PWA spec 0.22 km). */
  zoneExitRadiusM?: number;
  threshold: ThresholdCfg;
}

interface CamState {
  inside: Record<string, boolean>;
  lastFire: Record<string, number>;
}

/** One corridor measurement: identity + timing + accumulated path. */
export interface ZoneRun {
  id: string;
  /** enter-gate crossing time, ms epoch. */
  enterT: number;
  /** fixing that opened the run (the actual GPS fix, not the gate pin). */
  enterPos: GeoPoint;
  /** previous fix — path accumulator pointer (update on every step). */
  lastPos: GeoPoint;
  /** accumulated haversine path length since enter, meters. */
  accM: number;
}

interface ZoneState {
  insideEnter: boolean;
  lastFire: number;
  run: ZoneRun | null;
}

const DEFAULT_REARM_MS = 45_000;
const DEFAULT_MIN_INTERVAL_MS = 900;
const DEFAULT_CAM_RADII: [number, number, number] = [500, 300, 150];
const DEFAULT_PASSING_M = 60;
/** Corridor gates — PWA parity: enter 180 m, exit 220 m (preview/app.js). */
const DEFAULT_ZONE_ENTER_M = 180;
const DEFAULT_ZONE_EXIT_M = 220;
/** hysteresis margin — a pin must be left by this much before "inside" flips false. */
const RING_HYST_M = 60;
/** PWA rule: dt <= 3 s can't carry a sane average — the verdict reports 0. */
const MIN_AVG_DT_S = 3;
/** below this km/h a declared-len sanity window is stretched; GPS-noise floor. */
const CRAWL_KMH = 8;
/** a fix farther than this fraction of the segment past the enter gate kills the run. */
const PAST_FACTOR = 1.5;
const KPH_TO_MS = 1 / 3.6;

const pair = (lat: number, lng: number): GeoPoint => ({ lat, lng });
const gate = (t: [number, number]): GeoPoint => ({ lat: t[0], lng: t[1] });

export class AlertEngine {
  private readonly points: AlertPoint[];
  private readonly zones: AlertZone[];
  private readonly emit: (ev: AlertEvent) => void;
  private opts: AlertEngineOptions;
  private camStates = new Map<string, CamState>();
  private zoneStates = new Map<string, ZoneState>();
  private lastEmitAt = -Infinity;

  constructor(
    points: AlertPoint[],
    zones: AlertZone[],
    opts: AlertEngineOptions,
    emit: (ev: AlertEvent) => void,
  ) {
    this.points = points;
    this.zones = zones;
    this.opts = opts;
    this.emit = emit;
  }

  /** Live-update threshold/radii without discarding ring/re-arm state. */
  setOptions(opts: AlertEngineOptions): void {
    this.opts = opts;
  }

  reset(): void {
    this.camStates = new Map();
    this.zoneStates = new Map();
    this.lastEmitAt = -Infinity;
  }

  /** Feed one fix. speedKph null when GPS gave no speed. nowMs = Date.now(). */
  onPos(lat: number, lng: number, speedKph: number | null, nowMs: number): void {
    const [r500, r300, r150] = this.opts.camRadiiM ?? DEFAULT_CAM_RADII;
    for (const p of this.points) {
      const d = distanceKm(pair(lat, lng), pair(p.lat, p.lng)) * 1000;
      const st = this.camStateFor(p.id);
      this.stepRing(p, st, 'cam_500', r500, d, speedKph, nowMs);
      this.stepRing(p, st, 'cam_300', r300, d, speedKph, nowMs);
      this.stepRing(p, st, 'cam_150', r150, d, speedKph, nowMs);
      this.stepRing(p, st, 'cam_passing', this.opts.passingRadiusM ?? DEFAULT_PASSING_M, d, speedKph, nowMs);
    }
    for (const z of this.zones) {
      this.stepZone(z, lat, lng, speedKph, nowMs);
    }
  }

  private camStateFor(id: string): CamState {
    let st = this.camStates.get(id);
    if (!st) {
      st = { inside: {}, lastFire: {} };
      this.camStates.set(id, st);
    }
    return st;
  }

  private zoneStateFor(id: string): ZoneState {
    let st = this.zoneStates.get(id);
    if (!st) {
      st = { insideEnter: false, lastFire: -Infinity, run: null };
      this.zoneStates.set(id, st);
    }
    return st;
  }

  private stepRing(
    p: AlertPoint,
    st: CamState,
    key: AlertKey,
    radiusM: number,
    distM: number,
    speedKph: number | null,
    nowMs: number,
  ): void {
    const wasInside = st.inside[key] ?? false;
    let inside = wasInside;
    if (distM <= radiusM) inside = true;
    else if (distM > radiusM + RING_HYST_M) inside = false;

    const rearmOk = nowMs - (st.lastFire[key] ?? -Infinity) >= (this.opts.rearmMs ?? DEFAULT_REARM_MS);
    const intervalOk = nowMs - this.lastEmitAt >= (this.opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS);
    if (inside && !wasInside && rearmOk && intervalOk) {
      st.lastFire[key] = nowMs;
      this.emit({
        key,
        pointId: p.id,
        pointType: p.type,
        distM,
        over: this.overFor(speedKph, p.limitKph),
        speedKph,
        limitKph: p.limitKph,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        lat: p.lat,
        lng: p.lng,
        atMs: nowMs,
        uid: `${key}#${p.id}#${nowMs}`,
      });
      this.lastEmitAt = nowMs;
    }
    st.inside[key] = inside;
  }

  private stepZone(z: AlertZone, lat: number, lng: number, speedKph: number | null, nowMs: number): void {
    const st = this.zoneStateFor(z.id);
    const enterR = this.opts.zoneEnterRadiusM ?? DEFAULT_ZONE_ENTER_M;
    const exitR = this.opts.zoneExitRadiusM ?? DEFAULT_ZONE_EXIT_M;
    const segLen = z.lenM > 0 ? z.lenM : distanceKm(gate(z.enter), gate(z.exit)) * 1000;
    const fix = pair(lat, lng);

    const dEnter = distanceKm(fix, gate(z.enter)) * 1000;
    const wasInside = st.insideEnter;
    let inside = wasInside;
    if (dEnter <= enterR) inside = true;
    else if (dEnter > enterR + RING_HYST_M) inside = false;

    const rearmOk = nowMs - st.lastFire >= (this.opts.rearmMs ?? DEFAULT_REARM_MS);
    if (inside && !wasInside && rearmOk) {
      st.lastFire = nowMs;
      st.run = { id: z.id, enterT: nowMs, enterPos: fix, lastPos: fix, accM: 0 };
      this.emit({
        key: 'zone_enter',
        pointId: z.id,
        pointType: 'zone',
        distM: dEnter,
        over: this.overFor(speedKph, z.limitKph),
        speedKph,
        limitKph: z.limitKph,
        nameAr: z.nameAr,
        nameEn: z.nameEn,
        lat: z.enter[0],
        lng: z.enter[1],
        atMs: nowMs,
        uid: `zone_enter#${z.id}#${nowMs}`,
      });
      this.lastEmitAt = nowMs;
    }
    st.insideEnter = inside;

    const run = st.run;
    if (!run) return;

    // grow the path accumulator with THIS fix, then judge the exit
    run.accM += distanceKm(run.lastPos, fix) * 1000;
    run.lastPos = fix;

    // sanity: the runner left the corridor without touching the exit gate
    const elapsed = nowMs - run.enterT;
    const declared = segLen > 0 ? segLen : 1_400;
    const maxRunMs = ((declared / (CRAWL_KMH * KPH_TO_MS)) * 2) * 1000;
    const clearlyPast = dEnter > declared * PAST_FACTOR;
    if (clearlyPast || elapsed > maxRunMs) {
      st.run = null;
      return;
    }

    const dExit = distanceKm(fix, gate(z.exit)) * 1000;
    if (dExit <= exitR) {
      const elapsedSec = elapsed / 1000;
      // PWA parity: km*3600/dt with the dt<=3 s -> 0 rule (lib/geo.js)
      const avgKph = elapsedSec > MIN_AVG_DT_S ? (run.accM / 1000) * 3600 / elapsedSec : 0;
      const overRun = this.overFor(avgKph, z.limitKph);
      st.run = null;
      this.emit({
        key: overRun ? 'zone_exit_bad' : 'zone_exit_ok',
        pointId: z.id,
        pointType: 'zone',
        distM: dExit,
        over: overRun,
        speedKph,
        limitKph: z.limitKph,
        avgSpeedKph: avgKph,
        segmentLenM: segLen,
        elapsedSec,
        nameAr: z.nameAr,
        nameEn: z.nameEn,
        lat: z.exit[0],
        lng: z.exit[1],
        atMs: nowMs,
        uid: `${overRun ? 'zone_exit_bad' : 'zone_exit_ok'}#${z.id}#${nowMs}`,
      });
      this.lastEmitAt = nowMs;
    }
  }

  private overFor(speedKph: number | null, limitKph: number | null): boolean | null {
    if (speedKph == null || limitKph == null) return null;
    const th = this.opts.threshold;
    const cap = th.mode === 'abs' ? limitKph + th.absKph : limitKph * (1 + th.pct / 100);
    return speedKph > cap;
  }
}
