// Nazra QA — minimal zone-exit probe against compiled engine.
const { AlertEngine } = require('./engine_out/engine/AlertEngine.js');
// const src = require('fs').readFileSync('../app/src/engine/AlertEngine.ts', 'utf8'); // sanity marker
const enter = [31.9867, 35.9420];
const exit_ = [31.9800, 35.9360];
const zones = [{ id: 'Z1', enter, exit: exit_, lenM: 1400, limitKph: 60, nameAr: 'z', nameEn: 'z' }];
const evs = [];
engine = new AlertEngine([], zones, { threshold: { mode: 'abs', absKph: 10 } }, (ev) => evs.push(ev));
const t0 = 1777777000000;
engine.onPos(enter[0], enter[1], 60, t0);                       // at enter gate
engine.onPos(31.9867 + 0.5 * (exit_[0] - enter[0]), 35.9420 + 0.5 * (exit_[1] - enter[1]), 60, t0 + 15000);
engine.onPos(exit_[0], exit_[1], 60, t0 + 30000);               // exactly at exit
engine.onPos(exit_[0] - 0.0001 * (exit_[0] - enter[0]), exit_[1] - 0.0001 * (exit_[1] - enter[1]), 60, t0 + 31500); // 70m past
console.log(JSON.stringify(evs.map(e => ({ key: e.key, t: e.atMs, d: Math.round(e.distM), avg: e.avgSpeedKph })), null, 1));
console.log('zoneState', JSON.stringify(engine.zoneStates.get('Z1')));
