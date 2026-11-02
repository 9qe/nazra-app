'use strict';
// Nazra نظرة — DOM/network/hardware layer. Pure math + alert logic live in ./lib/.
// Leaflet + Carto dark via CDN. No build step, no npm deps.

import { distKm, bearing, avgSpeedKmH, clamp, distanceAlongM, pushRoutePoint } from './lib/geo.js';
import { nearest, pickAlert, markSpoken } from './lib/alerts.js';
import { GLYPH, TYPE_WORD, toArNum, fmtNear, announce } from './lib/ui.js';
import { createVoice } from './lib/voice.js';

const $ = (id) => document.getElementById(id);

/* ---------- state ---------- */
const state = {
  pack: null, items: null,            // items: one merged list (cameras + avg zones), built once at load
  L: null, map: null, myMk: null, elMk: {},
  pos: null, speed: 0, heading: 0,
  route: [],
  corridor: null, corridorStart: 0, cordHide: null,
  screen: 'onboarding',
  actx: null,
  demo: null, trail: null,
  opts: { blob: '#EDEFF6', preDist: 500, threshold: 10, voice: 'both', vibe: true, msa: false,
    avgShow: true, avgWarn: true, bgoff: true, share: true, flash: true },
  voiced: {}, lastSpoke: 0,
  filters: 'all',
  hadWatch: false,
};

const voice = createVoice({
  getOpts: () => state.opts,
  getCtx: () => state.actx,
  setCtx: (c) => { state.actx = c; },
});
const speak = voice.speak;

/* ---------- merged items (built once, reused everywhere) ---------- */
function mergeItems(pack) {
  const cams = (pack.cameras || []).map(c => ({
    ...c,
    alertGeo: (Array.isArray(c.geo) && c.geo.length === 2) ? c.geo : null,
  }));
  const zones = (pack.zones || []).map(z => ({
    ...z, type: 'avg',
    alertGeo: (z.corridor && Array.isArray(z.corridor.enter)) ? z.corridor.enter : null,
  }));
  // avg zones alert on their ENTER point only (never the exit) — enforced by alertGeo.
  return [...cams, ...zones].filter(it => it.alertGeo);
}

/* ---------- screens ---------- */
function go(name) {
  for (const el of document.querySelectorAll('.screen')) { el.classList.remove('on'); el.hidden = true; }
  const el = $('sc-' + name); el.hidden = false; el.classList.add('on'); state.screen = name;
  if (name === 'home' && state.map) setTimeout(() => state.map.invalidateSize(), 80);
  if (name === 'list') renderList();
  location.hash = name === 'onboarding' ? '' : '#' + name;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[id^="btn-back"]');
  if (b) go('home');
});

/* ---------- boot ---------- */
async function boot() {
  try { Object.assign(state.opts, JSON.parse(localStorage.getItem('nz_opts') || '{}')); } catch { }
  const h = (location.hash || '').replace('#', '');
  state.pack = await (await fetch('./data/radars.json')).json();
  state.items = mergeItems(state.pack);
  setupSheetTabs(); bindReport(); bindSettings(); bindList();
  $('btn-loc').onclick = async () => {
    voice.ensureAudio();
    if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('./sw.js'); } catch { } }
    if (!state.map) initMap();
    await startLive();
  };
  $('btn-demo').onclick = async () => {
    voice.ensureAudio();
    if (!state.map) await startLive({ quiet: true });
    go('home'); startDemo();
  };
  go(['home', 'list', 'report', 'settings'].includes(h) ? h : 'onboarding');
  initIfL();
}
function initIfL() {
  if (window.L && !state.map) initMap();
}
boot();
/* Leaflet is a deferred CDN script — if it lands after boot, catch it on load. */
if (document.readyState === 'complete') initIfL();
else window.addEventListener('load', initIfL, { once: true });

function initMap() {
  if (state.map || !window.L) return;
  state.L = window.L;
  state.map = window.L.map('map', { zoomControl: false, attributionControl: false, preferCanvas: false,
    gestureHandling: true }).setView([31.9540, 35.9280], 12);
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd',
  }).addTo(state.map);
  renderPins();
  $('btn-locate').onclick = () => { if (state.pos) state.map.flyTo(state.pos, Math.max(state.map.getZoom(), 15)); };
  $('btn-layers').onclick = () => toast('طبقات: قريب قريب — × جاد — قادم');
}

/* ---------- pins ---------- */
function pinHTML(type, corridor, label) {
  return `<div class="cam-pin ${type}${corridor ? ' corridor' : ''}">${GLYPH[type] || '⚠️'}${label ? `<span class="lbl">${label}</span>` : ''}</div>`;
}
function renderPins() {
  if (!state.map || !state.items) return;
  for (const it of state.items) {
    const geo = it.alertGeo; if (!geo) continue;
    const lbl = it.limit ? String(it.limit) : '';
    const mk = state.L.marker(geo, {
      icon: state.L.divIcon({ className: 'me-mark', html: pinHTML(it.type, it.corridor, lbl),
        iconSize: [38, 38], iconAnchor: [19, 19] }),
      title: it.nameEn || it.name || '',
      zIndexOffset: 100,
    }).addTo(state.map);
    mk.on('click', () => showCamPopup(it));
    state.elMk[it.id] = mk;
  }
}
function showCamPopup(it) {
  const d = state.pos ? distKm(state.pos, it.alertGeo) : null;
  const dn = d == null ? '—' : (d < 1 ? toArNum(Math.round(d * 1000)) : toArNum(+d.toFixed(1)));
  const du = d == null ? '' : (d < 1 ? 'م' : 'كم');
  sheetSet(`
    <div class="sh-row" id="r-${it.id}">
      <div class="ic">${GLYPH[it.type]}</div>
      <div><b>${nameOf(it)}</b><small>${it.nameEn || ''} · ${it.operator || ''}${it.limit ? ' · حد ' + it.limit : ''}</small></div>
      <div class="d"><b>${dn}</b><small>${du}</small></div>
    </div>`);
}
function nameOf(it) {
  return it.name || it.nameEn || (it.type === 'avg' ? 'ممر متوسط السرعة' : 'كاميرا');
}

/* ---------- geolocation ---------- */
let watchId = null;
function watchOpts() {
  return { enableHighAccuracy: true, maximumAge: 900, timeout: 12000 };
}
function reWatchLive() {
  // re-arm the watch after bgoff pausing or demo takeover, without re-navigating
  if (watchId !== null || !state.hadWatch || state.demo) return;
  watchId = navigator.geolocation.watchPosition(onPos, () => { }, watchOpts());
}
async function startLive({ quiet } = {}) {
  if (!state.map) return;
  try {
    await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }));
    if (state.screen === 'onboarding') go('home');
  } catch (e) {
    toast('ما قدرنا نشغل الموقع — شوّف صلاحيات المتصفح');
  }
  if (watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(onPos, e => { if (!quiet) toast('موقع: مفاجأة — تأكد من صلاحيات الموقع'); }, watchOpts());
  state.hadWatch = true;
  go('home');
}
function dropMe() {
  if (!state.myMk && window.L && state.pos) {
    state.myMk = window.L.marker(state.pos, {
      icon: window.L.divIcon({ className: 'me-mark', html: '<div class="me-dot"></div><div class="me-dir"></div>', iconSize: [22, 31], iconAnchor: [11, 15] }),
      zIndexOffset: 1000, interactive: false,
    }).addTo(state.map);
  } else if (state.myMk && state.pos) {
    state.myMk.setLatLng(state.pos);
  }
}
function onPos(p) {
  if (state.demo) return;            // scripted demo drives — GPS must not fight it for state.pos
  if (state.screen !== 'home') return;
  state.pos = [p.coords.latitude, p.coords.longitude];
  const sp = (p.coords.speed ?? 0) * 3.6;
  if (sp > 0.5) {
    state.speed = state.speed * 0.4 + Math.max(0, sp) * 0.6;
    if (p.coords.heading != null) state.heading = p.coords.heading;
  }
  pushRoutePoint(state.route, { lat: state.pos[0], lng: state.pos[1], t: p.timestamp });
  dropMe(); drawHud(); tickCorridor(); alertEngine();
}

/* ---------- HUD (single nearest scan feeds limit, next, pill and courtesy) ---------- */
function drawHud() {
  const n = nearest(state.items, state.pos, 2.5);
  const lim = liveLimit(n);
  $('speed').textContent = Math.round(state.speed);
  const dial = document.querySelector('.speedring .ring-fg');
  if (dial) {
    const pct = clamp(state.speed / 120, 0, 1);
    dial.style.strokeDashoffset = String(276.5 * (1 - pct));
    dial.classList.remove('warn', 'bad');
    if (lim && state.speed > lim) dial.classList.add(state.speed > lim + 20 ? 'bad' : 'warn');
  }
  $('limit').textContent = 'حد ' + (lim ?? '—');
  $('next').textContent = n ? `${fmtNear(n.d)} على ${GLYPH[n.o.type] || ''}` : 'لا شي على ٣ كم';
  setStatePill(n);
  updateCourtesy(n, lim);
}
function liveLimit(near) {
  const corridor = state.corridor ? state.corridor.z : null;
  if (corridor) return corridor.limit;
  const n = near || nearest(state.items, state.pos, 0.6);
  return (n && n.d <= 0.6) ? (n.o.limit ?? null) : null;
}

function setStatePill(n) {
  const near = n || nearest(state.items, state.pos, 1.0);
  let st = 'ok', txt = 'خارج أي منطقة';
  if (state.corridor) { st = 'inzone'; txt = 'ممر متوسط السرعة'; }
  else if (near && near.d < 0.35) { st = 'enter'; txt = 'على وشك'; }
  else if (near && near.d < 0.85) { st = 'enter'; txt = 'على 800 م'; }
  $('state').className = 'pill ' + st; $('state').textContent = txt;
}

/* ---------- courtesy strip — visible whenever nothing is actively alerting ---------- */
function updateCourtesy(n, _lim) {
  const el = $('courtesy');
  if (alertActive) { el.hidden = true; return; }
  const cl = state.corridor ? state.corridor.z.limit : (n ? n.o.limit : null);
  if (n) {
    $('cs-ico').textContent = GLYPH[n.o.type] || '📍';
    $('cs-txt').textContent = cl ? 'حد ' + toArNum(cl) : 'الحد غير معلن';
    $('cs-sub').textContent = `بعد ${fmtNear(n.d)} ${TYPE_WORD[n.o.type] || 'تنبيه'}`;
  } else {
    $('cs-ico').textContent = '🧿';
    $('cs-txt').textContent = 'الطريق صافي';
    $('cs-sub').textContent = 'ولا كاميرا بالجوار';
  }
  el.hidden = false;
}

/* ---------- corridor live ---------- */
function tickCorridor() {
  const now = Date.now();
  if (!state.corridor) {
    for (const z of state.pack.zones || []) {
      const e = z.corridor?.enter; if (!e) continue;
      if (distKm(state.pos, e) < 0.18) {
        clearTimeout(state.cordHide);   // a pending verdict panel yields to a live corridor
        state.corridor = { z, enterT: now, enterPos: state.pos.slice() };
        speak('zone_enter');
        updateCordUI();
      } else if (state.opts.avgWarn && !state.voiced['warn_' + z.id]) {
        // pre-warning ~200 m before the gate (fires once per zone per session)
        if (distKm(state.pos, e) < 0.20) {
          state.voiced['warn_' + z.id] = 1;
          toast(`ممر ${z.name || z.nameEn || 'متوسط السرعة'} بعد ٢٠٠ م — ثبّت سرعتك 📏`, 4000);
        }
      }
    }
  } else {
    const z = state.corridor.z;
    const x = z.corridor?.exit;
    if (x && distKm(state.pos, x) < 0.22) {
      const avg = corridorAvg();
      state.corridor = null;
      state.corridorStart = 0;
      speak(avg <= z.limit ? 'zone_exit_ok' : 'zone_exit_bad');
      showCorridorVerdict(z, avg);
    } else updateCordUI();
  }
}
function corridorAvg() {
  if (!state.corridor) return 0;
  const r = state.route.filter(p => p.t >= state.corridor.enterT);
  return avgSpeedKmH(r);
}
function updateCordUI() {
  const c = state.corridor; const z = c?.z; if (!z) return;
  const avg = corridorAvg();
  const goneM = distanceAlongM(c.enterPos, state.pos);
  const remain = clamp(z.lenM - goneM, 0, z.lenM);
  if ($('corridor').hidden) $('corridor').hidden = false;
  $('co-name').textContent = nameOf(z);
  $('co-limit').textContent = 'حد ' + z.limit;
  $('co-avg').textContent = state.opts.avgShow ? toArNum(Math.round(avg)) : '—';
  $('co-avg').className = avg <= z.limit ? 'ok' : 'bad';
  $('co-remain').textContent = (remain / 1000).toFixed(2) + ' كم';
  $('co-len').textContent = (z.lenM / 1000).toFixed(2) + ' كم';
  $('co-fill').style.width = `${clamp((goneM / Math.max(1, z.lenM)) * 100, 0, 100)}%`;
}
/** Corridor verdict: keeps the panel on screen 6 s, toast carries the numbers. */
function showCorridorVerdict(z, avg) {
  const ok = avg <= z.limit;
  const avgR = Math.round(avg);
  if ($('corridor').hidden) $('corridor').hidden = false;
  $('co-name').textContent = nameOf(z);
  $('co-limit').textContent = 'حد ' + z.limit;
  $('co-avg').textContent = toArNum(avgR);
  $('co-avg').className = ok ? 'ok' : 'bad';
  $('co-remain').textContent = (0).toFixed(2) + ' كم';
  $('co-len').textContent = (z.lenM / 1000).toFixed(2) + ' كم';
  $('co-fill').style.width = '100%';
  toast(`تم بالمتوسط ${toArNum(avgR)} — الحد ${toArNum(z.limit)}`, 5000);
  state.cordHide = setTimeout(() => { if (!state.corridor) $('corridor').hidden = true; }, 6000);
}

/* ---------- alert engine ---------- */
let alertActive = false;
function alertEngine() {
  if (!state.pos || !state.items) return;
  const r = pickAlert({
    items: state.items, pos: state.pos, speedKmh: state.speed,
    opts: state.opts, voiced: state.voiced, lastSpoke: state.lastSpoke, now: Date.now(),
  });
  if (!r.best) {
    // No camera within preDist -> card clears (never timer-cleared while you're near one).
    if (alertActive) { alertActive = false; $('alert').hidden = true; }
    return;
  }
  const { o, d } = r.best;
  if (r.shouldSpeak) {
    markSpoken(state.voiced, o.id, r.key, Date.now());
    state.lastSpoke = Date.now();
    speak(r.key);
    drawAlert(o, r.key, d, r.over);
    if (state.opts.vibe && navigator.vibrate) navigator.vibrate(r.over > 0 ? [120, 70, 140] : [40]);
  }
  if ($('alert').hidden) drawAlert(o, r.key, d, r.over);
  if (r.over > 0 && state.opts.flash) flashOverlay();
  alertActive = true;
}
function drawAlert(o, key, d, over) {
  const lines = {
    cam_500: 'بالك 🧿 كاميرا بعد 500 — خفّف',
    cam_300: '٣٠٠ للكاميرا يا زلمة، خصّ شوي',
    cam_150: '١٥٠ على الكاميرا — آخر فرصة',
    cam_passing: 'الكاميرا هون 📸 ابتسم وعدّى بطيخة',
  };
  $('ac-ico').textContent = GLYPH[o.type] || '🧿';
  $('ac-title').textContent = nameOf(o);
  let sub = lines[key] || '';
  if (o.type === 'avg') {
    const exit = o.corridor?.exit;
    const remainM = exit ? distanceAlongM(state.pos, exit) : 0;
    sub = `مينتور (ممر) — متبقي ${fmtNear(clamp(remainM / 1000, 0, 99))} للخروج`;
  }
  $('ac-sub').textContent = sub + (over > 0 ? ` · فوق الحد ${toArNum(Math.round(over))} كم/س` : ` · عندك ${toArNum(Math.round(state.speed))}`);
  $('ac-dist').textContent = d < 1 ? `${toArNum(Math.round(d * 1000))} م` : `${toArNum(+d.toFixed(1))} كم`;
  $('ac-dir').textContent = 'اتجاه ' + toArNum(Math.round(bearing(state.pos, o.alertGeo))) + '°';
  $('ac-count').textContent = `${Math.max(1, Math.round((d * 1000) / Math.max(20, state.speed) / 3.6))}`;
  $('alert').hidden = false;
  $('alert').className = 'alertcard ' + (over > 0 ? 'bad' : over > -10 ? 'warn' : key === 'cam_passing' ? 'ok' : '');
}
function flashOverlay() {
  let f = document.querySelector('.flash'); if (f) return;
  f = document.createElement('div'); f.className = 'flash';
  document.querySelector('.app').appendChild(f);
  setTimeout(() => f.remove(), 550);
}

/* ---------- sheet + list ---------- */
function sheetSet(html) { const b = $('sheet-body'); if (b) b.innerHTML = html || ''; }
function setupSheetTabs() {
  const tabs = document.querySelectorAll('.sh-tabs .tab');
  if (!tabs.length) return;
  tabs.forEach(t => t.onclick = () => {
    tabs.forEach(x => x.classList.remove('on')); t.classList.add('on');
    const k = t.dataset.t;
    let html = '';
    if (k === 'near') {
      const near = [];
      for (const o of state.items) {
        const d = state.pos ? distKm(state.pos, o.alertGeo) : null;
        if (d != null && d < 3) near.push({ o, d });
      }
      near.sort((a, b) => a.d - b.d);
      html = near.slice(0, 6).map(r => `
        <div class="sh-row" id="r-${r.o.id}">
          <div class="ic">${GLYPH[r.o.type]}</div>
          <div><b>${nameOf(r.o)}</b><small>${r.o.nameEn || ''} ${r.o.limit ? `· حد ${r.o.limit}` : ''}</small></div>
          <div class="d"><b>${r.d < 1 ? toArNum(Math.round(r.d * 1000)) : toArNum(+r.d.toFixed(1))}</b><small>${r.d < 1 ? 'م' : 'كم'}</small></div>
        </div>`).join('') || `<div class="sh-empty">لا شي قريب يا زلمة — سير هدّي</div>`;
    }
    if (k === 'corrid') {
      html = (state.pack.zones || []).map(z => {
        const spanKm = z.corridor ? distKm(z.corridor.enter, z.corridor.exit).toFixed(1) : '—';
        return `
        <div class="sh-row"><div class="ic">📏</div>
          <div><b>${nameOf(z)}</b><small>${z.lenM / 1000} كم · حد ${z.limit}</small></div>
          <div class="d"><b>${spanKm}</b><small>كم</small></div>
        </div>`;
      }).join('');
    }
    if (k === 'route') {
      html = `<div class="sh-empty">مسارك الكامل — قريبا ملي حكاية 👀</div>`;
    }
    sheetSet(html);
  });
}
$('btn-hud').onclick = () => go('list');
$('btn-report').onclick = () => go('report');
$('btn-stop').onclick = () => stopDemo();

/* list */
function renderList() {
  if (!state.pack || !state.items) return;
  const q = $('search').value.trim();
  const rows = [];
  for (const it of state.items) {
    if (state.filters !== 'all' && it.type !== state.filters) continue;
    if (q && !(it.name || '').includes(q) && !(it.nameEn || '').toLowerCase().includes(q.toLowerCase())) continue;
    const d = state.pos ? distKm(state.pos, it.alertGeo) : null;
    rows.push(`<li>
      <div class="t-ic" style="border-color:${{avg:'#3D5AF1',fixed:'#F0537E',light:'#F5A623',locality:'#2FBF71',bump:'#8A6B3A'}[it.type]}">${GLYPH[it.type]}</div>
      <div><b>${nameOf(it)}</b><small>${it.nameEn || ''} · ${it.operator || ''}${it.limit ? ' · حد ' + it.limit : ''}</small></div>
      <div class="m-dist">${d != null ? fmtNear(d) : '—'}</div>
    </li>`);
  }
  document.getElementById('list').innerHTML = rows.join('') || '<li>ما في نتائج بهذه الفترة</li>';
}
function bindList() {
  $('search').addEventListener('input', renderList);
  const fEl = document.getElementById('filters');
  if (fEl) fEl.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.filters = b.dataset.f;
    [...fEl.children].forEach(c => c.classList.toggle('on', c === b));
    renderList();
  });
}

/* ---------- report ---------- */
let repType = null;
function bindReport() {
  const g = document.getElementById('rep-types'); if (!g) return;
  g.addEventListener('click', e => {
    const b = e.target.closest('.rtile'); if (!b) return;
    repType = b.dataset.t;
    [...g.children].forEach(c => c.classList.toggle('on', c === b));
    const note = {
      avg: 'ممر متوسط السرعة — حدى ٢ اتجاهين متتاليين، وحننتسخينها.',
      fixed: 'رادار ثابت — بكون مربوط بعمود أو جسر إشارة.',
      light: 'كاميرا إشارة — تلتقط تجاوز الحد الأحمر السرعة.',
      locality: 'ضبطة متحركة — بلّغنا وبلّغ شباب ساري.',
      bump: 'مطبّ بدون علامة — خطر ميكانيكي.',
      other: 'كل إلنا الشرف، سجّلّنا التفاصيل ببلاغ لاحق.',
    }[repType];
    $('rep-note').hidden = !note; $('rep-note').textContent = note;
  });
  $('btn-send').onclick = () => {
    if (!repType) { toast('اختار نوع البلاغ أولاً'); return; }
    const arr = JSON.parse(localStorage.getItem('nz_reports') || '[]');
    arr.push({ type: repType, pos: state.pos, t: Date.now() });
    localStorage.setItem('nz_reports', JSON.stringify(arr));
    repType = null; [...g.children].forEach(c => c.classList.remove('on'));
    $('rep-note').hidden = true;
    speak('report_thanks'); toast('بلاغك وصل 🧿');
    go('home');
  };
}
function toast(text, ms = 2600) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  t.setAttribute('role', 'status');
  document.querySelector('.app').appendChild(t);
  announce(text);
  setTimeout(() => t.remove(), ms);
}

/* ---------- settings ---------- */
function bindSettings() {
  const o = state.opts;
  const map = [['set-distance', 'preDist', 'num'], ['set-threshold', 'threshold', 'str'],
    ['set-voice', 'voice', 'str'], ['set-vibe', 'vibe', 'bool'], ['set-msa', 'msa', 'bool'],
    ['set-avgwarn', 'avgWarn', 'bool'], ['set-avgshow', 'avgShow', 'bool'],
    ['set-bgoff', 'bgoff', 'bool'], ['set-share', 'share', 'bool']];
  for (const [id, key, kind] of map) {
    const el = $(id); if (!el) continue;
    if (kind === 'bool') el.checked = !!o[key]; else if (kind === 'num') el.value = `${o[key]}`; else el.value = o[key];
    el.addEventListener("input", () => {
      if (kind === 'bool') o[key] = el.checked;
      else if (kind === 'num') o[key] = isNaN(+el.value) ? el.value : +el.value;
      else o[key] = el.value;
      localStorage.setItem('nz_opts', JSON.stringify(o));
    });
  }
  $('btn-clear').onclick = () => { localStorage.removeItem('nz_opts'); localStorage.removeItem('nz_reports'); localStorage.removeItem('nz_lastpos'); toast('صفّر بياناتك المحلية'); };
  $('btn-settings').onclick = () => go('settings');
  $('btn-list').onclick = () => go('list');
}

/* ---------- demo drive (scripted along Airport Rd) ---------- */
function startDemo() {
  const demoPath = [[31.9867, 35.9420], [31.9800, 35.9360], [31.9741, 35.9299], [31.9684, 35.9225],
    [31.9644, 35.9153], [31.9596, 35.9189], [31.9562, 35.9268], [31.9482, 35.9338], [31.9442, 35.9258]];
  state.route.length = 0;   // fresh run: trail and corridor avg start clean
  state.demo = { i: 0, timer: null, speed: 90 };
  state.trail = (state.L && state.map)
    ? state.L.polyline([], { color: '#7ED0FF', weight: 3, opacity: 0.6 }).addTo(state.map) : null;
  $('btn-stop').hidden = false;
  toast('ديمو: قيادة على شارع المطار — ركّب وسجّل التنبيه');
  state.demo.timer = setInterval(() => {
    const d = demoPath[state.demo.i]; if (!d) return stopDemo();
    state.demo.i++;
    state.pos = d;
    state.speed = Math.min(120, 60 + Math.sin(d[0] * 50) * 20 + 10);
    pushRoutePoint(state.route, { lat: d[0], lng: d[1], t: Date.now() });
    if (state.trail) state.trail.setLatLngs(state.route.map(p => [p.lat, p.lng]));
    dropMe(); drawHud(); tickCorridor(); alertEngine();
    state.map?.flyTo(d, 15, { animate: true, duration: 1 });
  }, 1400);
}
function stopDemo() {
  if (state.demo?.timer) clearInterval(state.demo.timer);
  state.demo = null;
  if (state.trail) { state.trail.remove(); state.trail = null; }   // clear the drawn trail
  if (alertActive) { alertActive = false; $('alert').hidden = true; }
  $('btn-stop').hidden = true;
  reWatchLive();                                                    // GPS back on duty
  toast('الديمو انتهى 🧿');
}

/* window resize for leaflet */
window.addEventListener('resize', () => { state.map?.invalidateSize(); });
/* tab visibility: iOS silent web can't run bg GPS; surface the info, honor bgoff */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (state.screen === 'home' && state.pos) {
      localStorage.setItem('nz_lastpos', JSON.stringify(state.pos));
    }
    // set-bgoff: no GPS while the page is closed
    if (state.opts.bgoff && watchId !== null && !state.demo) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  } else {
    voice.ensureAudio();
    reWatchLive();
  }
});
