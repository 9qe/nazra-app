'use strict';
// Nazra — route/direction-aware AlertEngine regression spec.
// Requires the compiled harness (release/qa/_scripts/engine_route_out).
// Rebuild:  npx tsc -p app/scripts/tsconfig.harness.json
// Run:      node tests/engine_route_spec.cjs
// Exit 0 = all green, exit 1 prints FAIL lines (same style as geo_spec.mjs).

const { AlertEngine } = require('../release/qa/_scripts/engine_route_out/engine/AlertEngine.js');
const {
  RouteCorridor, projectOntoRoute, angularDiffDeg, CORRIDOR_WIDTH_M,
} = require('../release/qa/_scripts/engine_route_out/engine/RouteCorridor.js');

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond) {
  if (cond) { pass++; } else { fail++; failures.push(name); console.error('  FAIL ' + name); }
}
function eq(name, got, want) { ok(`${name} (got ${JSON.stringify(got)})`, got === want); }
function noEmit(events, name) { eq(name + ' — no events', events.length, 0); }

/* ---------- scene: straight route east on the equator for exact meters ---------- */
const DEG_PER_KM = 180 / (Math.PI * 6371);      // deg of lng per km at latitude 0
const M_PER_DEG_LAT = Math.PI * 6371 / 180 * 1000;  // meters per deg of latitude (~111195)
const metersToLng = (m) => (m / 1000) * DEG_PER_KM;
const metersToLat = (m) => m / M_PER_DEG_LAT;

const lat0 = 0;
// provider-order route: [lng, lat] pairs west→east, 12 km
const route = [];
for (let m = 0; m <= 12000; m += 1000) route.push([metersToLng(m), lat0]);

const point = (over = {}) => ({
  id: 'P1', type: 'fixed', lat: lat0, lng: metersToLng(5000), limitKph: 60,
  nameAr: 'كاميرا', nameEn: 'cam', ...over,
});
const zone = (over = {}) => ({
  // engine zone contract: enter/exit are [lat, lng] (AlertEngine gate())
  id: 'Z1', enter: [lat0, metersToLng(4600)], exit: [lat0, metersToLng(5600)],
  lenM: 1000, limitKph: 60, nameAr: 'ممر', nameEn: 'zone', ...over,
});

const BASE = { threshold: { mode: 'abs', absKph: 10, pct: 15 } };
// rings are labels, not radii; generous ladder kills float-edge misses at 500 m
const RINGS = { camRadiiM: [900, 600, 300], passingRadiusM: 60 };

/** camera-only engine (no zones) for ring scenes. */
function makeCam(camOver = {}, engOpt = {}) {
  const events = [];
  const eng = new AlertEngine([point(camOver)], [], { ...RINGS, ...BASE, ...engOpt }, (ev) => events.push(ev));
  return { eng, events };
}
/** engine with the zone fixture for verdict scenes. */
function makeZone(engOpt = {}) {
  const events = [];
  const eng = new AlertEngine([point()], [zone()], { ...RINGS, ...BASE, ...engOpt }, (ev) => events.push(ev));
  return { eng, events };
}
const T0 = 1_700_000_000_000;

/* ---------- 1. angularDiffDeg wrap semantics ---------- */
{
  eq('angDiff 350 vs 10 = 20', angularDiffDeg(350, 10), 20);
  eq('angDiff 10 vs 350 = 20', angularDiffDeg(10, 350), 20);
  eq('angDiff 90 -> 90', angularDiffDeg(90, 180), 90);
  eq('angDiff 180 boundary', angularDiffDeg(0, 180), 180);
  eq('angDiff same = 0', angularDiffDeg(270, 270), 0);
}

/* ---------- 2. identity guard: no route layer, no heading -> legacy behavior ---------- */
{
  const { eng, events } = makeCam();
  eng.onPos(lat0, metersToLng(4500), 60, T0);            // no heading, no route
  ok('legacy cam_500 fires on ring enter',
    events.length === 1 && events[0].key === 'cam_500');
}

/* ---------- 3. parallel road: on route fires | 60 m off -> silent ---------- */
{
  const { eng, events } = makeCam({}, { routeAware: true });
  eng.setRoute(route);
  eng.onPos(lat0, metersToLng(4500), 60, T0, 90);        // camera on the route line, ahead
  ok('on-route camera fires', events.length === 1 && events[0].key === 'cam_500');
}
{
  // same scene, camera 60 m north of the route -> outside the corridor
  const { eng, events } = makeCam({ lat: metersToLat(60) }, { routeAware: true });
  eng.setRoute(route);
  eng.onPos(lat0, metersToLng(4500), 60, T0, 90);
  noEmit(events, 'off-route camera (60 m off corridor)');
}

/* ---------- 4. opposite direction: bearing gate ---------- */
{
  const westCam = { id: 'D1', type: 'fixed', lat: lat0, lng: metersToLng(5000),
    limitKph: 60, nameAr: 'ك', nameEn: 'c', bearingDeg: 270 };
  const events = [];
  const eng = new AlertEngine([westCam], [], { ...RINGS, ...BASE }, (ev) => events.push(ev));
  eng.onPos(lat0, metersToLng(4500), 60, T0, 90);        // heading east, watches west
  noEmit(events, 'opposite direction refused');
  eng.onPos(lat0, metersToLng(5500), 60, T0 + 60_000, 270); // heading west, matches
  ok('matching direction fires', events.length === 1 && events[0].key === 'cam_500');
}

/* ---------- 5. GPS jitter: heading null + bearing -> silent; cluster no double-fire ---------- */
{
  const westCam = { id: 'JP', type: 'fixed', lat: lat0, lng: metersToLng(5000),
    limitKph: 60, nameAr: 'ك', nameEn: 'c', bearingDeg: 270 };
  const events = [];
  const eng = new AlertEngine([westCam], [], { ...RINGS, ...BASE }, (ev) => events.push(ev));
  eng.onPos(lat0, metersToLng(4500), 60, T0, null);      // heading unknown — engine fails open
  ok('bearing set + heading null -> fires (fail-open, legacy parity)',
    events.length === 1 && events[0].key === 'cam_500');
  // jitter cluster: fresh engine, matches the watched bearing
  const ev2 = [];
  const eng2 = new AlertEngine([westCam], [], { ...RINGS, ...BASE }, (e) => ev2.push(e));
  eng2.onPos(lat0, metersToLng(4500), 60, T0, 270);
  eng2.onPos(lat0, metersToLng(4501), 60, T0 + 400, 270); // jitter inside the same ring
  eng2.onPos(lat0, metersToLng(4499), 61, T0 + 800, 270);
  ok('jitter cluster -> single fire', ev2.length === 1);
}

/* ---------- 6. intersection cross-route: deviation from the rerouted corridor ---------- */
{
  const { eng, events } = makeCam({}, { routeAware: true });
  eng.setRoute(route);
  eng.onPos(lat0, metersToLng(4200), 60, T0, 90);        // inside cam_900? no — 800 m away: first ring hit
  ok('pre-reroute first ring', events.length === 1);
  // reroute: new corridor veers north; camera stays on the OLD line, fix off both
  const turned = route.map(([lng]) => [lng, metersToLat(0)]);  // will be replaced below
  turned.length = 0;
  for (let m = 0; m <= 4500; m += 900) turned.push([metersToLng(m), lat0]);
  for (let m = 1; m <= 8; m++) turned.push([metersToLng(4500), metersToLat(m * 120)]);
  eng.setRoute(turned);
  eng.onPos(metersToLat(0), metersToLng(4201), 60, T0 + 30_000, 90);
  eq('cross-route deviation: camera silent', events.length, 1);
}

/* ---------- 7. rerouting mid-flight: setRoute keeps ahead-camera firing ---------- */
{
  const { eng, events } = makeCam({}, { routeAware: true });
  eng.setRoute(route);
  eng.onPos(lat0, metersToLng(4200), 60, T0, 90);        // first ring @800 m
  ok('pre-reroute ring fired', events.length === 1);
  const shifted = route.map(([lng]) => [lng, metersToLat(-30)]);  // 30 m south
  eng.setRoute(shifted);
  eng.onPos(metersToLat(-30), metersToLng(4200), 60, T0 + 10_000, 90);
  // the driver re-enters the new ring from outside (40 m west on the shifted line):
  // ring state says inside from the first hit -> hysteresis holds -> no double fire
  eq('hysteresis holds across reroute', events.length, 1);
  // drive forward into the next ring of the shifted corridor
  eng.onPos(metersToLat(-30), metersToLng(4450), 60, T0 + 20_000, 90);
  ok('rerouted corridor: nearer ring fires ahead of the fix',
    events.length === 2 && events[1].pointId === 'P1');
}

/* ---------- 8. behind gate: camera already passed stays silent ---------- */
{
  const { eng, events } = makeCam({}, { routeAware: true });
  eng.setRoute(route);
  eng.onPos(lat0, metersToLng(6200), 60, T0, 90);        // 1200 m past the camera
  noEmit(events, 'camera behind the fix refused');
}

/* ---------- 9. corridor verdicts preserved with route layer on ---------- */
{
  const { eng, events } = makeZone({ routeAware: true });
  eng.setRoute(route);
  eng.onPos(lat0, metersToLng(4600), 60, T0, 90);        // enter gate
  for (let m = 4620; m <= 5580; m += 30)                  // 30 m steps at 60 km/h ≈ 1.8 s
    eng.onPos(lat0, metersToLng(m), 60, T0 + 1800 * ((m - 4620) / 30 + 1), 90);
  eng.onPos(lat0, metersToLng(5600), 60, T0 + 1800 * 33, 90);  // exit gate
  const keys = events.map((e) => e.key);
  ok('zone_enter present', keys.includes('zone_enter'));
  ok('corridor verdict fired', keys.some((k) => k === 'zone_exit_ok' || k === 'zone_exit_bad'));
}

/* ---------- 10. projectOntoRoute direct checks ---------- */
{
  const proj = projectOntoRoute(route, { lat: 0, lng: metersToLng(4500) }, CORRIDOR_WIDTH_M);
  ok('project on-route returns alongM', proj !== null);
  if (proj) {
    ok(`alongM ≈ 4500 (got ${Math.round(proj.alongM)})`, Math.abs(proj.alongM - 4500) < 30);
    ok('offsetM ~ 0', proj.offsetM < 5);
  }
  const far = projectOntoRoute(route, { lat: metersToLat(2000), lng: metersToLng(4500) }, CORRIDOR_WIDTH_M);
  eq('project far off-route -> null', far, null);
}

/* ---------- RouteCorridor class parity ---------- */
{
  const rc = new RouteCorridor(route);
  ok('nearestRoutePointM on-route small', rc.nearestRoutePointM({ lat: 0, lng: metersToLng(3000) }) < 5);
  ok('nearestRoutePointM ~2000 when 2 km north',
    Math.abs(rc.nearestRoutePointM({ lat: metersToLat(2000), lng: metersToLng(3000) }) - 2000) < 10);
  eq('isEmpty false', rc.isEmpty, false);
  rc.setRoute([]);
  eq('isEmpty after empty setRoute', rc.isEmpty, true);
  eq('nearestRoutePointM empty -> null', rc.nearestRoutePointM({ lat: 0, lng: 0 }), null);
}

/* ---------- report ---------- */
console.log(`\nENGINE ROUTE SPEC: ${pass} checks passed, ${fail} failed.`);
if (fail) {
  console.error('FAILED:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('PASS');
process.exit(0);



