// Nazra QA — AlertEngine corridor runtime harness (REPRODUCTION ONLY, no product edits).
// Simulates a drive through one zone: enter gate -> 20 fixes along corridor -> exit gate.
const { AlertEngine } = require('./engine_out/engine/AlertEngine.js');
const { distanceKm } = require('./engine_out/utils/geo.js');

const enter = [31.9867, 35.9420];
const exit_ = [31.9800, 35.9360];
const zones = [{ id: 'Z-AIR-01', enter, exit: exit_, lenM: 1400, limitKph: 60, nameAr: 'شارع المطار', nameEn: 'Airport Rd seg1' }];

const events = [];
const engine = new AlertEngine([], zones, { threshold: { mode: 'abs', absKph: 10 } }, (ev) => {
  events.push(`${ev.key} @t=${ev.atMs} distM=${Math.round(ev.distM)}${ev.avgSpeedKph != null ? ` avg=${ev.avgSpeedKph.toFixed(1)}` : ''}`);
});

const t0 = 1_777_777_000_000;
// fix 1: exactly at the enter gate
engine.onPos(enter[0], enter[1], 60, t0);
// fixes 2..23: linear interpolation enter->exit then 3 fixes PAST it (exit evaluation)
let last = t0;
for (let i = 1; i <= 23; i++) {
  const f = i / 20;
  const lat = enter[0] + f * (exit_[0] - enter[0]);
  const lng = enter[1] + f * (exit_[1] - enter[1]);
  last = t0 + Math.round(i * 1500);
  engine.onPos(lat, lng, 60, last);
}
console.log('EVENTS EMITTED:');
for (const e of events) console.log('  ', e);
// QA introspection: why zero events? dump internal zone state
const zs = engine.zoneStates;
for (const [id, st] of zs) console.log('ZONE STATE', id, JSON.stringify(st));
const cs = engine.camStates;
for (const [id, st] of cs) console.log('CAM STATE', id, JSON.stringify(st));
console.log('lastEmitAt:', engine.lastEmitAt);
console.log('zones held:', zones.length, 'points held:', 0);
console.log('DONE-NO-CRASH');
