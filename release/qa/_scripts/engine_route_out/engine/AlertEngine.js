"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertEngine = void 0;
const geo_1 = require("../utils/geo");
const RouteCorridor_1 = require("./RouteCorridor");
/** Camera fires only when |heading - watched bearing| <= this (wraps 0/360). */
const DIRECTION_TOLERANCE_DEG = 90;
/** Route-aware gate: anchors projecting more than this far off the route never fire (m). */
const ANCHOR_ON_ROUTE_M = 50;
const DEFAULT_REARM_MS = 45000;
const DEFAULT_MIN_INTERVAL_MS = 900;
const DEFAULT_CAM_RADII = [500, 300, 150];
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
const pair = (lat, lng) => ({ lat, lng });
const gate = (t) => ({ lat: t[0], lng: t[1] });
class AlertEngine {
    constructor(points, zones, opts, emit) {
        this.camStates = new Map();
        this.zoneStates = new Map();
        this.corridor = null;
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
    /** Install/replace the route layer (rerouting). null drops route-awareness. */
    setRoute(geometry) {
        if (geometry === null) {
            this.corridor = null;
            return;
        }
        if (this.corridor === null)
            this.corridor = new RouteCorridor_1.RouteCorridor(geometry);
        else
            this.corridor.setRoute(geometry);
    }
    reset() {
        this.camStates = new Map();
        this.zoneStates = new Map();
        this.lastEmitAt = -Infinity;
    }
    /** Feed one fix. speedKph null when GPS gave no speed. nowMs = Date.now(). */
    onPos(lat, lng, speedKph, nowMs, headingDeg = null) {
        const routeAware = this.opts.routeAware === true && this.corridor !== null && !this.corridor.isEmpty;
        const fix = pair(lat, lng);
        const [r500, r300, r150] = this.opts.camRadiiM ?? DEFAULT_CAM_RADII;
        for (const p of this.points) {
            const d = (0, geo_1.distanceKm)(fix, pair(p.lat, p.lng)) * 1000;
            if (headingDeg != null && p.bearingDeg != null && (0, RouteCorridor_1.angularDiffDeg)(headingDeg, p.bearingDeg) > DIRECTION_TOLERANCE_DEG)
                continue;
            if (routeAware && !this.routeGateOpen(fix, pair(p.lat, p.lng)))
                continue;
            const st = this.camStateFor(p.id);
            this.stepRing(p, st, 'cam_500', r500, d, speedKph, nowMs);
            this.stepRing(p, st, 'cam_300', r300, d, speedKph, nowMs);
            this.stepRing(p, st, 'cam_150', r150, d, speedKph, nowMs);
            this.stepRing(p, st, 'cam_passing', this.opts.passingRadiusM ?? DEFAULT_PASSING_M, d, speedKph, nowMs);
        }
        for (const z of this.zones) {
            if (headingDeg != null && z.bearingDeg != null && (0, RouteCorridor_1.angularDiffDeg)(headingDeg, z.bearingDeg) > DIRECTION_TOLERANCE_DEG)
                continue;
            if (routeAware && !this.routeGateOpen(fix, gate(z.exit)))
                continue;
            this.stepZone(z, lat, lng, speedKph, nowMs);
        }
    }
    /**
     * Route gate: cameras/zones whose anchor projects off-route, or behind the
     * fix along the route, never fire. False => skipped for THIS fix entirely
     * (no emit, no ring-state mutation) so a later legal fix behaves as if the
     * refused fix never happened.
     */
    routeGateOpen(fix, anchor) {
        if (this.corridor === null)
            return true;
        const camProj = this.corridor.projectionOf(anchor);
        const fixProj = this.corridor.projectionOf(fix);
        if (camProj === null || fixProj === null)
            return false;
        // anchor must actually sit on the driven line — parallel-road cameras never fire
        if (camProj.offsetM > ANCHOR_ON_ROUTE_M)
            return false;
        return camProj.alongM - fixProj.alongM >= -RouteCorridor_1.BEHIND_PAST_M;
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
    stepZone(z, lat, lng, speedKph, nowMs) {
        const st = this.zoneStateFor(z.id);
        const enterR = this.opts.zoneEnterRadiusM ?? DEFAULT_ZONE_ENTER_M;
        const exitR = this.opts.zoneExitRadiusM ?? DEFAULT_ZONE_EXIT_M;
        const segLen = z.lenM > 0 ? z.lenM : (0, geo_1.distanceKm)(gate(z.enter), gate(z.exit)) * 1000;
        const fix = pair(lat, lng);
        const dEnter = (0, geo_1.distanceKm)(fix, gate(z.enter)) * 1000;
        const wasInside = st.insideEnter;
        let inside = wasInside;
        if (dEnter <= enterR)
            inside = true;
        else if (dEnter > enterR + RING_HYST_M)
            inside = false;
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
        if (!run)
            return;
        // grow the path accumulator with THIS fix, then judge the exit
        run.accM += (0, geo_1.distanceKm)(run.lastPos, fix) * 1000;
        run.lastPos = fix;
        // sanity: the runner left the corridor without touching the exit gate
        const elapsed = nowMs - run.enterT;
        const declared = segLen > 0 ? segLen : 1400;
        const maxRunMs = ((declared / (CRAWL_KMH * KPH_TO_MS)) * 2) * 1000;
        const clearlyPast = dEnter > declared * PAST_FACTOR;
        if (clearlyPast || elapsed > maxRunMs) {
            st.run = null;
            return;
        }
        const dExit = (0, geo_1.distanceKm)(fix, gate(z.exit)) * 1000;
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
    overFor(speedKph, limitKph) {
        if (speedKph == null || limitKph == null)
            return null;
        const th = this.opts.threshold;
        const cap = th.mode === 'abs' ? limitKph + th.absKph : limitKph * (1 + th.pct / 100);
        return speedKph > cap;
    }
}
exports.AlertEngine = AlertEngine;
