// Nazra — corridor engine harness (RN AlertEngine, F5/F6/F8 verification).
// Usage: node scripts/corridor_harness.cjs <engineDir>
//   <engineDir> = compiled JS root containing engine/AlertEngine.js + utils/geo.js
// Scenario 1 (F5): enter gate -> 21 moving fixes -> exit gate; engine must emit
//   >=1 zone_enter AND >=1 zone_exit event.
// Scenario 2 (F6/F8): 5 segments x 100 m over 100 s accumulated-path average
//   must read 18 km/h (+/-0.5) — the PWA corridorAvg cross-check.
'use strict';
const path = require('path');

const engineDir = process.argv[2];
if (!engineDir) {
  console.error('FAIL: engineDir argument missing');
  process.exit(2);
}
const { AlertEngine } = require(path.join(engineDir, 'engine', 'AlertEngine.js'));

let failures = 0;
const assert = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
};
const dist = (a, b) => {
  // same haversine the engine uses, for building the geometry
  const R = Math.PI / 180;
  const dLat = (b[0] - a[0]) * R, dLng = (b[1] - a[1]) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(s)) * 1000; // meters
};

/* ---- scenario 1: 21-fix corridor drive, enter + exit must both fire ---- */
const enter = [31.9867, 35.9420];
const exit = [31.9800, 35.9360];
const zones = [{
  id: 'Z-AIR-01',
  enter,
  exit,
  lenM: 1400,
  limitKph: 60,
  nameAr: 'شارع المطار',
  nameEn: 'Airport Rd seg1',
}];

const events = [];
const t0 = 1_777_777_000_000;
const robust = new AlertEngine([], zones, { threshold: { mode: 'abs', absKph: 10 } },
  (ev) => events.push(`${ev.key} @t=${ev.atMs - t0}ms distM=${Math.round(ev.distM)}`));

// approach fixes so the ring ladders have spacers, then the corridor drive
robust.onPos(31.99, 35.947, 60, t0); // outside both gates
robust.onPos(enter[0], enter[1], 60, t0 + 8_000); // fix 1: on the enter gate
for (let i = 1; i <= 21; i++) {
  const f = i / 20;
  robust.onPos(
    enter[0] + f * (exit[0] - enter[0]),
    enter[1] + f * (exit[1] - enter[1]),
    60,
    t0 + 8_000 + i * 3_000,
  );
}
robust.onPos(exit[0], exit[1], 60, t0 + 8_000 + 22 * 3_000); // land on the exit gate
robust.onPos(exit[0] - 0.001, exit[1] - 0.001, 60, t0 + 8_000 + 23 * 3_000); // hover it

const enters = events.filter((e) => e.startsWith('zone_enter')).length;
const exits = events.filter((e) => e.startsWith('zone_exit')).length;
console.log(`scenario1: ${enters} zone_enter, ${exits} zone_exit of ${events.length} events`);
events.forEach((e) => console.log('  ', e));
assert(enters >= 1, 'F5: >=1 zone_enter fired');
assert(exits >= 1, 'F5: >=1 zone_exit fired');

/* ---- scenario 2: accumulated-path average = 18 km/h over the PWA case ---- */
// route: 5 segments of 100 m (6 fixes) over 100 s -> 0.5 km / 100 s = 18 km/h.
const start = [31.9867, 35.9420];
const dirUnit = [(exit[0] - start[0]) / dist(start, exit), (exit[1] - start[1]) / dist(start, exit)];
const step = [dirUnit[0] * 100, dirUnit[1] * 100];
const z2 = [{
  id: 'Z-RAMP-01',
  enter: start,
  exit: [
    start[0] + step[0] * 5,
    start[1] + step[1] * 5,
  ],
  lenM: 500,
  limitKph: 60,
  nameAr: 'ممر اختبار',
  nameEn: 'Harness ramp 500m',
}];
let avgOfExit = null;
const eng2 = new AlertEngine([], z2, { threshold: { mode: 'abs', absKph: 10 } },
  (ev) => {
    if (ev.avgSpeedKph != null) avgOfExit = ev.avgSpeedKph;
  });
const s0 = 1_777_777_000_000;
eng2.onPos(start[0], start[1], 18, s0); // enter fix
for (let i = 1; i <= 5; i++) {
  eng2.onPos(start[0] + step[0] * i, start[1] + step[1] * i, 18, s0 + i * 20_000); // 100 s total
}
assert(avgOfExit != null && Math.abs(avgOfExit - 18) <= 0.5,
  `F8: corridor avg ${avgOfExit == null ? 'none' : avgOfExit.toFixed(2)} ≈ 18 km/h (5×100 m / 100 s)`);

/* ---- scenario 3: gates honor 180/220 (F6) — 179 m fires enter, 330 m does not ---- */
const z3enter = [31.9867, 35.9420];
const z3 = [{ id: 'Z-GATE-01', enter: z3enter, exit: [31.9800, 35.9360], lenM: 1400, limitKph: 60, nameAr: '', nameEn: 'Gate probe' }];
// 1 deg lat ≈ 111,195 m -> 179 m ≈ 0.00161 deg
let enterFired = 0;
const eng3 = new AlertEngine([], z3, { threshold: { mode: 'abs', absKph: 10 } }, (ev) => {
  if (ev.key === 'zone_enter') enterFired++;
});
eng3.onPos(31.9867 + 0.0017, 35.9420, 60, s0 + 60_000); // ~189 m — outside
assert(enterFired === 0, 'F6: 189 m from enter gate does NOT fire (outside 180)');
eng3.onPos(31.9867 + 0.0014, 35.9420, 60, s0 + 66_000); // ~156 m — inside
assert(enterFired === 1, 'F6: 156 m from enter gate FIRES (inside 180)');

console.log(`TOTAL: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
