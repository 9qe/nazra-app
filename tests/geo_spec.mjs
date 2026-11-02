'use strict';
// Nazra نظرة — geo/alert/voice spec. Plain Node ESM, no test runner, no deps.
// Run from repo root: node tests/geo_spec.mjs
// Imports preview/lib directly — the whole point of the split: libs have no DOM.
// preview/package.json carries "type": "module" so Node parses these .js files as ESM.

import { distKm, bearing, clamp, avgSpeedKmH, distanceAlongM, pushRoutePoint } from '../preview/lib/geo.js';
import { nearest, pickAlert, markSpoken, alertGeoOf, bandKey, REARM_MS, SPEAK_MIN_MS } from '../preview/lib/alerts.js';
import { VOICE, MSA } from '../preview/lib/voice.js';
import { toArNum, fmtNear } from '../preview/lib/ui.js';

/* ---------- hand-rolled harness ---------- */
let pass = 0, fail = 0;
const failures = [];
function ok(name, cond) {
  if (cond) { pass++; } else { fail++; failures.push(name); console.error('  FAIL ' + name); }
}
function close(name, got, want, tol) {
  ok(`${name} (got ${got}, want ${want} ±${tol})`, Math.abs(got - want) <= tol);
}
function eq(name, got, want) {
  ok(`${name} (got ${JSON.stringify(got)})`, got === want || (JSON.stringify(got) === JSON.stringify(want)));
}

const DEG_PER_KM_EQ = 180 / (Math.PI * 6371);      // deg of lng per km at latitude 0
const metersToLngDeg = (m) => (m / 1000) * DEG_PER_KM_EQ;
const atMetersEast = (m) => [0, metersToLngDeg(m)]; // [lat,lng] on the equator, m meters east of [0,0]

/* ---------- 1. distKm ---------- */
{
  // Coordinates from the ticket: 1e-4 deg of lng at lat 31.9539 ≈ 11.12*0.848 ≈ 9.4 m.
  close('distKm Amman 1e-4 deg ≈ 9.4m', distKm([31.9539, 35.9106], [31.9539, 35.9107]) * 1000, 9.43, 0.5);
  // 1e-3 deg at the same latitude ≈ 94.3 m (the "≈95m" sanity of the ticket, at a real 1e-3 spacing).
  close('distKm Amman 1e-3 deg ≈ 94m', distKm([31.9539, 35.9106], [31.9539, 35.9116]) * 1000, 94.3, 2);
  close('distKm meridian (0,0)-(0,90) ≈ 10007.55km', distKm([0, 0], [0, 90]), 10007.55, 5);
  const p1 = [31.9, 35.91], p2 = [32.02, 36.2];
  ok('distKm symmetric', distKm(p1, p2) === distKm(p2, p1));
  ok('distKm positive', distKm(p1, p2) > 0);
}

/* ---------- 2. bearing ---------- */
{
  const a = [31, 35.91];
  close('bearing north = 0', bearing(a, [31.01, 35.91]), 0, 1);
  close('bearing east = 90', bearing(a, [31, 35.92]), 90, 1);
  close('bearing south = 180', bearing(a, [30.99, 35.91]), 180, 1);
  close('bearing west = 270', bearing(a, [31, 35.90]), 270, 1);
  ok('bearing in [0,360)', bearing(a, [30, 36]) >= 0 && bearing(a, [30, 36]) < 360);
}

/* ---------- 3. clamp ---------- */
{
  eq('clamp mid', clamp(2, 0, 3), 2);
  eq('clamp low', clamp(-1, 0, 3), 0);
  eq('clamp high', clamp(5, 0, 3), 3);
}

/* ---------- 4. corridor average speed (avgSpeedKmH) ---------- */
{
  // n points, segM meters apart, stepMs apart; 5 segments of 100 m = 500 m of path.
  const path = (n, segM, stepMs) => Array.from({ length: n }, (_, i) => ({
    lat: 0, lng: metersToLngDeg(i * segM), t: i * stepMs,
  }));
  const over = path(6, 100, 5000);        // 500 m / 25 s = 72 km/h
  close('avg 500m/25s = 72 km/h', avgSpeedKmH(over), 72, 0.5);
  ok('over-limit case is over (72 > 60)', avgSpeedKmH(over) > 60);
  const exact = path(6, 100, 6000);       // 500 m / 30 s = 60 km/h
  close('avg 500m/30s = 60 km/h', avgSpeedKmH(exact), 60, 0.5);
  ok('exactly-limit case satisfies limit', avgSpeedKmH(exact) <= 60);
  const under = path(6, 100, 12000);      // 500 m / 60 s = 30 km/h
  close('avg 500m/60s = 30 km/h', avgSpeedKmH(under), 30, 0.5);
  ok('under-limit case is under', avgSpeedKmH(under) < 60);
  eq('avg guards: <2 points', avgSpeedKmH([{ lat: 0, lng: 0, t: 0 }]), 0);
  eq('avg guards: dt<=3s', avgSpeedKmH([{ lat: 0, lng: 0, t: 0 }, { lat: 0, lng: 0.01, t: 3000 }]), 0);
}

/* ---------- 5. distanceAlongM + pushRoutePoint ---------- */
{
  close('distanceAlongM 500m', distanceAlongM([0, 0], [0, metersToLngDeg(500)]), 500, 0.5);
  const route = [];
  for (let i = 0; i < 402; i++) pushRoutePoint(route, { lat: i, lng: i, t: i, seq: i });
  eq('pushRoutePoint cap 400', route.length, 400);
  eq('pushRoutePoint drops oldest', route[0].seq, 2);
  eq('pushRoutePoint keeps newest', route[route.length - 1].seq, 401);
}

/* ---------- 6. nearest / alertGeoOf: avg zones alert on ENTER only ---------- */
{
  const items = [
    { id: 'FIX1', type: 'fixed', limit: 60, alertGeo: atMetersEast(500) },
    { id: 'FIX2', type: 'light', limit: 80, alertGeo: atMetersEast(300) },
    { id: 'AVG', type: 'avg', limit: 100, lenM: 1200,
      corridor: { enter: atMetersEast(1500), exit: atMetersEast(300) }, alertGeo: atMetersEast(1500) },
  ];
  const pos = atMetersEast(0);
  eq('alertGeoOf uses given alertGeo', alertGeoOf(items[2]), atMetersEast(1500));
  const n = nearest(items, pos, 0.5);
  eq('nearest picks FIX2', n.o.id, 'FIX2');
  close('nearest distance ~300m', n.d * 1000, 300, 1);
  eq('nearest excludes beyond maxKm', nearest(items, pos, 0.2), null);
  eq('nearest by enter only: avg exit nearby but enter far -> not picked',
    nearest(items, pos, 0.35)?.o.id, 'FIX2');
}

/* ---------- 7. pickAlert: bands, over, threshold ---------- */
{
  // Item parked at the origin; the driver moves east, so d = m meters exactly.
  const pick = (m, opts = {}, speedKmh = 0) => pickAlert({
    items: [{ id: 'X1', type: 'fixed', limit: 60, alertGeo: atMetersEast(0) }],
    pos: atMetersEast(m), speedKmh, opts: { preDist: 800, threshold: 10, ...opts },
    voiced: {}, lastSpoke: 0, now: 1000,
  });

  eq('band 100m -> cam_passing', pick(100).key, 'cam_passing');
  eq('band 200m -> cam_150', pick(200).key, 'cam_150');
  eq('band 400m -> cam_300', pick(400).key, 'cam_300');
  eq('band 600m -> cam_500', pick(600).key, 'cam_500');
  eq('beyond preDist -> no alert', pick(900).best, null);

  const speeding = pick(300, {}, 80);
  eq('over = speed - (limit+thr) = 10', speeding.over, 10);
  eq('cam_150 key', speeding.key, 'cam_150');
  ok('shouldSpeak true fresh', speeding.shouldSpeak === true);
  const pctRun = pick(300, { threshold: 'pct' }, 80);
  eq('pct threshold over = 14', pctRun.over, 14);
  const noLimit = pickAlert({
    items: [{ id: 'Y1', type: 'bump', alertGeo: atMetersEast(0) }],
    pos: atMetersEast(300), speedKmh: 80, opts: { preDist: 800, threshold: 10 }, voiced: {}, lastSpoke: 0, now: 1000,
  });
  eq('no limit -> over 0', noLimit.over, 0);
  eq('avg zone alerted through its enter point (exit ignored)',
    pickAlert({
      items: [{ id: 'Z1', type: 'avg', limit: 80, lenM: 1200,
        corridor: { enter: atMetersEast(0), exit: atMetersEast(0) }, alertGeo: atMetersEast(0) }],
      pos: atMetersEast(300), speedKmh: 80, opts: { preDist: 800, threshold: 10 }, voiced: {}, lastSpoke: 0, now: 1000,
    }).best.o.id, 'Z1');
}

/* ---------- 8. cooldown: per-camera re-arm + global interval + no dup keys ---------- */
{
  // FIX1 300 m ahead, FIX2 900 m ahead; the driver sits at the origin.
  const items = [
    { id: 'FIX1', type: 'fixed', limit: 60, alertGeo: atMetersEast(300) },
    { id: 'FIX2', type: 'light', limit: 60, alertGeo: atMetersEast(900) },
  ];
  const run = (voiced, lastSpoke, now) => pickAlert({
    items, pos: atMetersEast(0), speedKmh: 60, opts: { preDist: 1000, threshold: 10 },
    voiced, lastSpoke, now,
  });

  const voiced = {};
  eq('fresh -> shouldSpeak', run(voiced, 0, 1000).shouldSpeak, true);
  markSpoken(voiced, 'FIX1', 'cam_150', 1000);
  eq('cooldown blocks repeat within window',
    run(voiced, 0, 1000 + 2000).shouldSpeak, false);
  eq('re-arm after REARM_MS',
    run(voiced, 0, 1000 + REARM_MS + 1).shouldSpeak, true);
  eq('global min-interval blocks fresh camera',
    run({}, 1000 - 100, 1000).shouldSpeak, false);
  eq('global min-interval allows after gap',
    run({}, 1000 - (SPEAK_MIN_MS + 1), 1000).shouldSpeak, true);

  // no dup keys: two camera marks own distinct keys
  const v2 = {};
  markSpoken(v2, 'FIX1', 'cam_150', 1000);
  markSpoken(v2, 'FIX2', 'cam_300', 1200);
  eq('no dup keys across ids', Object.keys(v2).length, 4);
  const reied = pickAlert({ items, pos: atMetersEast(0), speedKmh: 0,
    opts: { preDist: 1000, threshold: 10 }, voiced: v2, lastSpoke: 0, now: 2000 });
  ok('escalated key format stable',
    reied.key === 'cam_150' && v2['FIX1_cam_150'] === 1000 && voiced['FIX2_last'] === undefined);
  eq('bandKey ladder 1', bandKey(0.1), 'cam_passing');
  eq('bandKey ladder 2', bandKey(0.2), 'cam_150');
  eq('bandKey ladder 3', bandKey(0.4), 'cam_300');
  eq('bandKey ladder 4', bandKey(0.6), 'cam_500');
}

/* ---------- 9. voice dictionaries — must match the shipped lines char-for-char ---------- */
{
  const V = {
    cam_500: 'بالك 🧿 كاميرا بعد 500 — خفّف ما تشوف الفلاش',
    cam_300: '300 للكاميرا يا زلمة، خصّ شوي',
    cam_150: '150 على الكاميرا — آخر فرصة، اهدى',
    cam_passing: 'الكاميرا هون — ابتسم وعدّى بطيخة',
    cam_passed_clean: 'عدّيتها بصافي يا زلمة — متابعه 🧿',
    cam_passed_flash: 'عدّيتها يا بطل — خفّف بالجاي لا تقهر',
    speed_no_cam: 'شو هالسرعة يا زلمة؟ ما في أسرع من الغرامة',
    cop_report: 'ضبطة على 2 كم يا زلمة — نخفف',
    report_thanks: 'بلاغك وصل زلمة — نظرة بتفكر الحسنات',
    hazard: 'بلاغ: حادث بعد 1 كم — اترك مسافة',
    streak: 'يوم نظيف — السلسلة صارت بطيخة زايدة',
    first_launch: 'أهلاً بك في نظرة يا زلمة — الكاميرا قبل ما تشوفك',
    zone_enter: 'دخلنا ممر سرعة — متابِعنا لحد',
    zone_exit_ok: 'خلصت الممر — عدّيتها نظيف',
    zone_exit_bad: 'خلصت الممر — متوسطك فوق',
  };
  const M = {
    cam_500: 'تنبيه: كاميرا على بعد 500 متر. يُرجى ضبط السرعة.',
    cam_300: 'كاميرا على 300 متر. التزم بالحد.',
    cam_150: 'كاميرا على 150 متر.',
    cam_passing: 'تجاوز الكاميرا. التزم بالحد.',
    cam_passed_clean: 'تم بالحفاظ على الحد. شكراً لك.',
    cam_passed_flash: 'إنتهت المنطقة. تابع الحد.',
    speed_no_cam: 'تجاوزت الحد المسموح. يُرجى خفض السرعة.',
    cop_report: 'لدى نقطة تفتيش على بعد كيلومترين. قلّل السرعة.',
    report_thanks: 'تمت إضافتك. شكراً.',
    hazard: 'تحذير: حادث ممكن يؤثر على السرعة.',
    streak: 'يوم متميز.',
    first_launch: 'أهلاً بك في نظرة.',
    zone_enter: 'دخلت منطقة متوسط سرعة.',
    zone_exit_ok: 'انتهى منطقة المراقبة. تابع الحد إن رغبت.',
    zone_exit_bad: 'تم تجاوز متوسط السرعة.',
  };
  eq('VOICE key set', Object.keys(VOICE).length, 15);
  eq('MSA key set', Object.keys(MSA).length, 15);
  eq('VOICE/MSA same keys', Object.keys(VOICE).sort().join('|'), Object.keys(MSA).sort().join('|'));
  for (const k of Object.keys(V)) ok(`VOICE.${k} exact`, VOICE[k] === V[k]);
  for (const k of Object.keys(M)) ok(`MSA.${k} exact`, MSA[k] === M[k]);
}

/* ---------- 10. UI helpers ---------- */
{
  eq('toArNum 60', toArNum(60), '٦٠');
  eq('toArNum 92', toArNum(92), '٩٢');
  eq('toArNum 1.2', toArNum(1.2), '١٫٢');
  eq('toArNum 400m', fmtNear(0.4), '٤٠٠ م');
  eq('toArNum 1.2km', fmtNear(1.2), '١٫٢ كم');
  eq('fmtNear null', fmtNear(null), '—');
}

/* ---------- report ---------- */
console.log(`\nPERF: ${pass} checks passed, ${fail} failed.`);
if (fail) {
  console.error('FAILED:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('PASS');
process.exit(0);
