"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_FILTERS = exports.TYPE_LABEL_AR = exports.TYPE_COLOR = exports.ALERT_ZONES = exports.ALERT_POINTS = exports.ZONE_COUNT = exports.CAMERA_COUNT = exports.ZONE_POINTS = exports.CAMERA_POINTS = exports.DATASET_META = void 0;
exports.pointName = pointName;
exports.searchTextOf = searchTextOf;
const radars_1 = require("./radars");
/**
 * Flattened views over the bundled corpus for map + alerting + list screens.
 * The generated radars.ts stays a raw typed mirror of the corpus JSON;
 * derivations live here.
 */
exports.DATASET_META = radars_1.RADAR_DATASET.meta;
exports.CAMERA_POINTS = radars_1.RADAR_DATASET.cameras.map((c) => ({
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
exports.ZONE_POINTS = radars_1.RADAR_DATASET.zones.map((z) => ({
    id: z.id,
    type: 'avg',
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
exports.CAMERA_COUNT = exports.CAMERA_POINTS.length;
exports.ZONE_COUNT = exports.ZONE_POINTS.length;
/** Engine-shaped views over the same corpus (AlertPoint/AlertZone). */
exports.ALERT_POINTS = exports.CAMERA_POINTS.map((p) => ({
    id: p.id,
    type: p.type,
    lat: p.lat,
    lng: p.lng,
    limitKph: p.limit,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
}));
exports.ALERT_ZONES = exports.ZONE_POINTS.map((z) => ({
    id: z.id,
    enter: z.enter,
    exit: z.exit,
    lenM: z.lenM,
    limitKph: z.limit,
    nameAr: z.nameAr,
    nameEn: z.nameEn,
}));
/** Pin colors — brand tokens per task spec. */
exports.TYPE_COLOR = {
    avg: '#3D5AF1',
    fixed: '#F0537E',
    light: '#F5A623',
    locality: '#2FBF71',
    bump: '#8A6B3A',
};
exports.TYPE_LABEL_AR = {
    avg: 'متوسط السرعة',
    fixed: 'رادار ثابت',
    light: 'كاميرا إشارة',
    locality: 'ضبطة',
    bump: 'مطبّ',
};
exports.TYPE_FILTERS = [
    { key: 'all', label: 'الكل' },
    { key: 'avg', label: exports.TYPE_LABEL_AR.avg },
    { key: 'fixed', label: exports.TYPE_LABEL_AR.fixed },
    { key: 'light', label: exports.TYPE_LABEL_AR.light },
    { key: 'locality', label: exports.TYPE_LABEL_AR.locality },
    { key: 'bump', label: exports.TYPE_LABEL_AR.bump },
];
function pointName(p) {
    return p.nameAr || p.nameEn || p.id;
}
/** Search haystack: names (ar/en), operator, source, type label, added date, limit. */
function searchTextOf(p) {
    const label = exports.TYPE_LABEL_AR[p.type] ?? '';
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
