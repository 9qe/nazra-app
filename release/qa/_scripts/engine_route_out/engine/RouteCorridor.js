"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteCorridor = exports.BEHIND_PAST_M = exports.CORRIDOR_WIDTH_M = void 0;
exports.angularDiffDeg = angularDiffDeg;
exports.projectOntoRoute = projectOntoRoute;
const geo_1 = require("../utils/geo");
/** Corridor width: on-route means within this distance of the route (m). */
exports.CORRIDOR_WIDTH_M = 120;
/** Cameras projecting more than this far behind the fix are refused (m). */
exports.BEHIND_PAST_M = 80;
/** km per degree of latitude on the mean sphere (matches utils/geo.ts Earth radius). */
const KM_PER_DEG_LAT = (Math.PI * 6371.0088) / 180;
/** Smallest angular difference between two bearings in degrees, wrapping 0/360 (350 vs 10 = 20). */
function angularDiffDeg(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}
/** [lng, lat] provider pair -> { lat, lng } engine point. Ordering owned by routing/types.ts. */
const lngLatToGeo = (p) => ({ lat: p[1], lng: p[0] });
function buildArrays(route) {
    const pts = (route ?? []).map(lngLatToGeo);
    const cumM = [];
    const segM = [];
    for (let i = 0; i < pts.length; i++) {
        cumM[i] = i === 0 ? 0 : cumM[i - 1] + segM[i - 1];
        if (i < pts.length - 1)
            segM[i] = (0, geo_1.distanceKm)(pts[i], pts[i + 1]) * 1000;
    }
    return { pts, cumM, segM };
}
/** Closest-point segment projection over prebuilt route arrays. */
function projectPts(ra, fix, corridorM) {
    const n = ra.pts.length;
    if (n === 0)
        return null;
    if (n === 1) {
        const offM = (0, geo_1.distanceKm)(ra.pts[0], fix) * 1000;
        return offM > corridorM ? null : { index: 0, alongM: 0, offsetM: offM };
    }
    let best = null;
    for (let j = 0; j < n - 1; j++) {
        const a = ra.pts[j];
        const b = ra.pts[j + 1];
        // Local equirectangular frame anchored on the segment — sub-meter at road scale.
        const latMid = (a.lat + b.lat) / 2;
        const kx = KM_PER_DEG_LAT * Math.cos((latMid * Math.PI) / 180);
        const ax = a.lng * kx;
        const ay = a.lat * KM_PER_DEG_LAT;
        const bx = b.lng * kx;
        const by = b.lat * KM_PER_DEG_LAT;
        const fx = fix.lng * kx;
        const fy = fix.lat * KM_PER_DEG_LAT;
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const tRaw = len2 === 0 ? 0 : ((fx - ax) * dx + (fy - ay) * dy) / len2;
        const t = tRaw < 0 ? 0 : tRaw > 1 ? 1 : tRaw;
        const offM = Math.hypot(fx - (ax + t * dx), fy - (ay + t * dy)) * 1000;
        if (best !== null && offM >= best.offsetM)
            continue;
        const alongM = ra.cumM[j] + t * ra.segM[j];
        best = { index: t >= 1 ? j + 1 : j, alongM, offsetM: offM };
    }
    if (best === null || best.offsetM > corridorM)
        return null;
    return best;
}
/**
 * Project a fix onto a raw provider-ordered [lng, lat] polyline.
 * Returns null for an empty route or when the fix is off-route beyond corridorM.
 */
function projectOntoRoute(points, fix, corridorM) {
    return projectPts(buildArrays(points), fix, corridorM);
}
/**
 * Route corridor filter owned by the engine (optional layer). Immutable per
 * route via the constructor; setRoute rebuilds it mid-flight without touching
 * any ring/re-arm state elsewhere in the engine.
 */
class RouteCorridor {
    constructor(route) {
        this.ra = buildArrays(route);
    }
    /** Replace the route geometry mid-flight (rerouting). */
    setRoute(route) {
        this.ra = buildArrays(route);
    }
    get isEmpty() {
        return this.ra.pts.length === 0;
    }
    /**
     * Distance in meters from the fix to the nearest route vertex (haversine,
     * same math as utils/geo.ts distanceKm). Empty route -> null.
     */
    nearestRoutePointM(fix) {
        if (this.ra.pts.length === 0)
            return null;
        let best = Infinity;
        for (const v of this.ra.pts) {
            const d = (0, geo_1.distanceKm)(v, fix) * 1000;
            if (d < best)
                best = d;
        }
        return best;
    }
    /**
     * Signed along-route arc position (meters from route start) of the fix's
     * segment projection, when the fix is within CORRIDOR_WIDTH_M of the route;
     * null for an empty route or an off-route fix. Callers subtract two values
     * (camera minus driver) to get the ahead/behind distance along the route.
     */
    aheadDistanceAlongM(fix) {
        const proj = projectPts(this.ra, fix, exports.CORRIDOR_WIDTH_M);
        return proj === null ? null : proj.alongM;
    }
    /**
     * Full projection (offset included) for the on-route anchor check: null when
     * empty/off-route beyond CORRIDOR_WIDTH_M.
     */
    projectionOf(fix) {
        return projectPts(this.ra, fix, exports.CORRIDOR_WIDTH_M);
    }
}
exports.RouteCorridor = RouteCorridor;
