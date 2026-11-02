"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertEngine = void 0;
const geo_1 = require("../utils/geo");
const DEFAULT_REARM_MS = 45000;
const DEFAULT_MIN_INTERVAL_MS = 900;
const DEFAULT_CAM_RADII = [500, 300, 150];
const DEFAULT_PASSING_M = 60;
const DEFAULT_ZONE_HIT_M = 80;
/** hysteresis margin — a pin must be left by this much before "inside" flips false. */
const RING_HYST_M = 60;
/** corridor run must last at least this before the exit fires (anti-glitch). */
const MIN_RUN_MS = 5000;
/** below this, GPS speed noise defines "crawling"; used only for run-time sanity. */
const CRAWL_KMH = 8;
const cable = 0.2778; // km/h → m/s
const pair = (lat, lng) => ({ lat, lng });
class AlertEngine {
    constructor(points, zones, opts, emit) {
        this.camStates = new Map();
        this.zoneStates = new Map();
        this.lastEmitAt = -Infinity;
        this.points = points;
        this.zones = zones;
        this.opts = opts;
        this.emit = emit;
    }
    /** Live-update threshold/radii without discarding ring/re-arm state. */
    setOptions(opts) {
        this.opts = opts;
    }
    reset() {
        this.camStates = new Map();
        this.zoneStates = new Map();
        this.lastEmitAt = -Infinity;
    }
    /** Feed one fix. speedKph null when GPS gave no speed. nowMs = Date.now(). */
    onPos(lat, lng, speedKph, nowMs) {
        const [r500, r300, r150] = this.opts.camRadiiM ?? DEFAULT_CAM_RADII;
        for (const p of this.points) {
            const d = (0, geo_1.distanceKm)(pair(lat, lng), pair(p.lat, p.lng)) * 1000;
            const st = this.camStateFor(p.id);
            this.stepRing(p, st, 'cam_500', r500, d, speedKph, nowMs);
            this.stepRing(p, st, 'cam_300', r300, d, speedKph, nowMs);
            this.stepRing(p, st, 'cam_150', r150, d, speedKph, nowMs);
            this.stepRing(p, st, 'cam_passing', this.opts.passingRadiusM ?? DEFAULT_PASSING_M, d, speedKph, nowMs);
        }
        for (const z of this.zones) {
            this.stepZone(z, lat, lng, nowMs, speedKph);
        }
    }
    camStateFor(id) {
        let st = this.camStates.get(id);
        if (!st) {
            st = { inside: {}, lastFire: {} };
            this.camStates.set(id, st);
        }
        return st;
    }
    zoneStateFor(id) {
        let st = this.zoneStates.get(id);
        if (!st) {
            st = { insideEnter: false, lastFire: -Infinity, run: null };
            this.zoneStates.set(id, st);
        }
        return st;
    }
    stepRing(p, st, key, radiusM, distM, speedKph, nowMs) {
        const wasInside = st.inside[key] ?? false;
        let inside = wasInside;
        if (distM <= radiusM)
            inside = true;
        else if (distM > radiusM + RING_HYST_M)
            inside = false;
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
    stepZone(z, lat, lng, nowMs, speedKph) {
        const st = this.zoneStateFor(z.id);
        const hitR = this.opts.zoneHitRadiusM ?? DEFAULT_ZONE_HIT_M;
        const segLen = z.lenM > 0 ? z.lenM : (0, geo_1.distanceKm)(pair(z.enter[0], z.enter[1]), pair(z.exit[0], z.exit[1])) * 1000;
        const dEnter = (0, geo_1.distanceKm)(pair(lat, lng), pair(z.enter[0], z.enter[1])) * 1000;
        const wasInside = st.insideEnter;
        let inside = wasInside;
        if (dEnter <= hitR)
            inside = true;
        else if (dEnter > hitR + RING_HYST_M)
            inside = false;
        const rearmOk = nowMs - st.lastFire >= (this.opts.rearmMs ?? DEFAULT_REARM_MS);
        const intervalOk = nowMs - this.lastEmitAt >= (this.opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS);
        if (inside && !wasInside && rearmOk && intervalOk) {
            st.lastFire = nowMs;
            st.run = { startedMs: nowMs, runLenM: segLen };
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
        if (!st.run)
            return;
        // sanity: user left the corridor without hitting the exit gate → kill the run
        const elapsed = nowMs - st.run.startedMs;
        const maxRunMs = (st.run.runLenM / (CRAWL_KMH * cable)) * 2;
        const clearlyPast = dEnter > st.run.runLenM * 1.5;
        if (clearlyPast || elapsed > maxRunMs) {
            st.run = null;
            return;
        }
        const dExit = (0, geo_1.distanceKm)(pair(lat, lng), pair(z.exit[0], z.exit[1])) * 1000;
        if (dExit <= hitR && elapsed >= MIN_RUN_MS) {
            const avgKph = (st.run.runLenM / (elapsed / 1000)) * 3.6;
            const overRun = this.overFor(avgKph, z.limitKph);
            st.run = null;
            const intervalOk2 = nowMs - this.lastEmitAt >= (this.opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS);
            if (!intervalOk2)
                return;
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
                elapsedSec: elapsed / 1000,
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
    overFor(speedKph, limitKph) {
        if (speedKph == null || limitKph == null)
            return null;
        const th = this.opts.threshold;
        const cap = th.mode === 'abs' ? limitKph + th.absKph : limitKph * (1 + th.pct / 100);
        return speedKph > cap;
    }
}
exports.AlertEngine = AlertEngine;
