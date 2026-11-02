'use strict';
// Nazra نظرة — engine + UI. Leaflet + Carto dark. No build step.
// Voice: Zeizo persona. Alerts: WebAudio tones + Web Speech (ar). Radarbot features: no ads, no jamming.

const $ = (id) => document.getElementById(id);
const R = Math.PI / 180;

/* ---------- geo ---------- */
function distKm(a, b) {
  const dLat = (b[0] - a[0]) * R, dLng = (b[1] - a[1]) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function bearing(a, b) {
  const y = Math.sin((b[1] - a[1]) * R) * Math.cos(b[0] * R);
  const x = Math.cos(a[0] * R) * Math.sin(b[0] * R) - Math.sin(a[0] * R) * Math.cos(b[0] * R) * Math.cos((b[1] - a[1]) * R);
  return (Math.atan2(y, x) / R + 360) % 360;
}

/* ---------- state ---------- */
const state = {
  pack: null,
  L: null, map: null, myMk: null, elMk: {},
  pos: null, speed: 0, heading: 0,
  route: [],
  corridor: null, corridorStart: 0,
  alertsCache: new Map(),
  screen: 'onboarding',
  actx: null,
  demo: null,
  opts: { blob: '#EDEFF6', preDist: 500, threshold: 10, voice: 'both', vibe: true, msa: false, avgShow: true, bgShare: true, flash: true },
  voiced: {},
  courtesy: null,
};

/* Zeizo voice — Arabic Web Speech (ar), with tone fallback */
const VOICE = {
  cam_500: 'بالك 🧿 كاميرا بعد 500 — خفّف ما تشوف الفلاش',
  cam_300: '300 للكاميرا يا زلمة، خصّ شوي',
  cam_150: '150 على الكاميرا — آخر فرصة، اهدى',
  cam_passing: 'الكاميرا هون — ابتسم وعدّى بطيخة',
  cam_passed_clean: 'عدّيتها نظيف يا بطل — نقاطك ما لمسها حد',
  cam_passed_flash: 'فلاش 📸 لا تقهر — الباكرة أبيض',
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
const MSA = {
  cam_500: 'تنبيه: كاميرا على بعد 500 متر. يُرجى ضبط السرعة.',
  cam_300: 'كاميرا على 300 متر. التزم بالحد.',
  cam_150: 'كاميرا على 150 متر.',
  cam_passing: 'تجاوز الكاميرا. التزم بالحد.',
  cam_passed_clean: 'تم بالحفاظ على الحد. شكراً لك.',
  cam_passed_flash: 'تم تسجيل تجاوز سرعة.',
  speed_no_cam: 'تجاوزت الحد المسموح. يُرجى خفض السرعة.',
  cop_report: 'لدى نقطة تفتيش على بعد كيلومترين. قلّل السرعة.',
  report_thanks: 'تمت إضافتك. شكراً.',
  hazard: 'تحذير: حادث ممكن يؤثر على السرعة.',
  streak: 'يوم متميز.',
  first_launch: 'أهلاً بك في نظرة.',
  zone_enter: 'دخلت منطقة متوسط سرعة.',
  zone_exit_ok: 'تم إجتياز المنطقة بشأن التزامك.',
  zone_exit_bad: 'تم تجاوز متوسط السرعة.',
};

let lastSpoke = 0;
function speak(key) {
  const m = state.opts.msa ? MSA : VOICE;
  const line = m[key] || m.cam_500;
  // avoid double-speaking overlapping alerts
  const now = Date.now();
  if (now - lastSpoke < 900) return;
  lastSpoke = now;
  if (state.opts.voice !== 'tts' && state.opts.voice !== 'both') return;
  try {
    const u = new SpeechSynthesisUtterance(line.replace(/[🧿📸🚨🔴🙏🍉👀]/g, ''));
    u.lang = 'ar-JO';
    const vs = speechSynthesis.getVoices();
    u.voice = vs.find(v => v.lang === 'ar-JO') || vs.find(v => v.lang.startsWith('ar')) || u.voice;
    u.rate = 1.05; u.pitch = 1.1; u.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) { /* lane 1 */ }
  beepFor(key);
}
function beepFor(key) {
  if (state.opts.voice === 'tts') return;
  ensureAudio();
  const p = { cam_150: [880, 660, .14, 3], cam_300: [720, 580, .13, 2], cam_500: [640, 520, .14, 1],
    speed_no_cam: [1100, 900, .1, 2], zone_enter: [440, 400, .2, 1], zone_exit_ok: [520, 780, .18, 2],
    zone_exit_bad: [400, 300, .2, 3], cam_passed_clean: [560, 840, .16, 2] }[key] || [640, 480, .15, 1];
  const [f1, f2, dur, n] = p;
  const c = state.actx, t = c.currentTime;
  for (let i = 0; i < n; i++) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = i % 2 ? f2 : f1;
    g.gain.setValueAtTime(0.09, t + i * dur); g.gain.exponentialRampToValueAtTime(0.01, t + (i + 1) * dur);
    o.connect(g).connect(c.destination);
    o.start(t + i * dur); o.stop(t + (i + 1) * dur);
  }
}
function ensureAudio() {
  if (!state.actx) state.actx = new (window.AudioContext || window.webkitAudioContext)();
  if (state.actx.state === 'suspended') state.actx.resume();
}

/* ---------- screens ---------- */
function go(name) {
  for (const el of document.querySelectorAll('.screen')) { el.classList.remove('on'); el.hidden = true; }
  const el = $('sc-' + name); el.hidden = false; el.classList.add('on'); state.screen = name;
  if (name === 'home' && state.map) setTimeout(() => state.map.invalidateSize(), 80);
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
  setupSheetTabs(); bindReport(); bindSettings();
  $('btn-loc').onclick = async () => {
    ensureAudio();
    if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('./sw.js'); } catch { } }
    if (!state.map) initMap();
    await startLive();
  };
  $('btn-demo').onclick = async () => {
    ensureAudio();
    if (!state.map) await startLive({ quiet: true });
    go('home'); startDemo();
  };
  go(['home', 'list', 'report', 'settings'].includes(h) ? h : 'onboarding');
  window.L?.then(() => { }, () => { });
  if (window.L) { initMap(); }
}
/* Leaflet is deferred — guard */
boot();

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
const GLYPH = { avg: '📏', fixed: '🛑', light: '💡', locality: '🚨', bump: '🐢' };
function pinHTML(type, corridor, label) {
  return `<div class="cam-pin ${type}${corridor ? ' corridor' : ''}">${GLYPH[type] || '⚠️'}${label ? `<span class="lbl">${label}</span>` : ''}</div>`;
}
function renderPins() {
  if (!state.map) return;
  const items = (state.pack.cameras || []).concat((state.pack.zones || []).map(z => ({ ...z, type: 'avg' })));
  for (const it of items) {
    if (!it.geo && !it.corridor) continue;
    const geo = it.geo || it.corridor.enter;
    const lbl = it.limit ? String(it.limit) : '';
    const mk = state.L.marker(geo, {
      icon: state.L.divIcon({ className: 'me-mark', html: pinHTML(it.type, it.corridor, lbl),
        iconSize: [38, 38], iconAnchor: [19, 19] }),
      title: it.nameEn || it.name,
      zIndexOffset: 100,
    }).addTo(state.map);
    mk.on('click', () => showCamPopup(it, mj));
    state.elMk[it.id] = mk;
  }
}
function showCamPopup(it, mk) {
  const d = state.pos ? distKm(state.pos, it.geo || it.corridor?.enter) : null;
  sheetSet(`
    <div class="sh-row" id="r-${it.id}">
      <div class="ic">${GLYPH[it.type]}</div>
      <div><b>${it.name || it.nameEn}</b><small>${it.nameEn || ''} · ${it.operator || ''}${it.limit ? ' · حد ' + it.limit : ''}</small></div>
      <div class="d"><b>${d ? (d < 1 ? Math.round(d * 1000) : d.toFixed(1) + 'k') : '—'}</b><small>${d ? 'متر' : ''}</small></div>
    </div>`);
}

/* ---------- geolocation ---------- */
let watchId = null;
async function startLive({ quiet } = {}) {
  if (!state.map) return;
  try {
    await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }));
    if (state.screen === 'onboarding') go('home');
  } catch (e) {
    toast('ما قدرنا نشغل الموقع — شوّف صلاحيات المتصفح');
  }
  if (watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(p => onPos(p), e => { if (!quiet) toast('موقع: مفاجأة — تأكد من صلاحيات الموقع'); },
    { enableHighAccuracy: true, maximumAge: 900, timeout: 12000 });
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
  if (state.screen !== 'home') return;
  state.pos = [p.coords.latitude, p.coords.longitude];
  const sp = (p.coords.speed ?? 0) * 3.6;
  if (sp > 0.5) {
    state.speed = state.speed * 0.4 + Math.max(0, sp) * 0.6;
    if (p.coords.heading != null) state.heading = p.coords.heading;
  }
  state.route.push({ lat: state.pos[0], lng: state.pos[1], t: p.timestamp });
  if (state.route.length > 400) state.route.shift();
  dropMe(); drawHud(); tickCorridor(); alertEngine();
}

/* ---------- HUD ---------- */
function maxSpeed() { return Math.max(...state.route.map(r => 0).concat([100]).slice(0), 120); }
function drawHud() {
  $('speed').textContent = Math.round(state.speed);
  const dial = document.querySelector('.speedring .ring-fg');
  if (dial) {
    const pct = Math.min(1, state.speed / 120);
    dial.style.strokeDashoffset = String(276.5 * (1 - pct));
    const lim = liveLimit();
    dial.classList.remove('warn', 'bad');
    if (lim && state.speed > lim) dial.classList.add(state.speed > lim + 20 ? 'bad' : 'warn');
  }
  const lim = liveLimit(); if (lim) $('limit').textContent = 'حد ' + lim;
  const n = nearestOf('any', 2.5);
  $('next').textContent = n ? `${n.d < 1 ? Math.round(n.d * 1000) : Math.round(n.d * 100) / 10 + 'k'} على ${GLYPH[n.o.type] || ''}` : 'لا شي على ٣ كم';
  setStatePill();
}
function liveLimit() {
  const corridor = state.corridor ? state.corridor.z : null;
  if (corridor) return corridor.limit;
  const n = nearestOf('any', 0.6);
  return n ? (n.o.limit || null) : null;
}

function nearestOf(type, maxKm, filter) {
  if (!state.pos || !state.pack) return null;
  let best = null;
  const items = state.pack.cameras.map(c => ({ ...c, type: c.type })).concat(state.pack.zones.map(z => ({ ...z, type: 'avg' })));
  for (const o of items) {
    if (filter && !filter(o)) continue;
    if (type !== 'any' && o.type !== type) continue;
    const geo = o.geo || o.corridor?.enter; if (!geo) continue;
    const d = distKm(state.pos, geo);
    if (d > maxKm) continue;
    if (!best || d < best.d) best = { o, d, b: bearing(state.pos, geo), geo };
  }
  return best;
}

function setStatePill() {
  const n = nearestOf('any', 1.0);
  let st = 'ok', txt = 'خارج أي منطقة';
  if (state.corridor) { st = 'inzone'; txt = 'ممر متوسط السرعة'; }
  else if (n && n.d < 0.35) { st = 'enter'; txt = 'على وشك'; }
  else if (n && n.d < 0.85) { st = 'enter'; txt = 'على 800 م'; }
  $('state').className = 'pill ' + st; $('state').textContent = txt;
}

/* ---------- corridor live ---------- */
function tickCorridor() {
  const now = Date.now();
  if (!state.corridor) {
    for (const z of state.pack.zones || []) {
      const e = z.corridor?.enter; if (!e) continue;
      if (distKm(state.pos, e) < 0.18) {
        state.corridor = { z, enterT: now, enterPos: state.pos.slice() };
        speak('zone_enter');
        updateCordUI();
      }
    }
  } else {
    const z = state.corridor.z;
    const x = z.corridor?.exit;
    if (x && distKm(state.pos, x) < 0.22) {
      const avg = corridorAvg();
      state.corridor = null;
      state.corridorStart = 0;
      $('corridor').hidden = true;
      speak(avg <= z.limit ? 'zone_exit_ok' : 'zone_exit_bad');
    } else updateCordUI();
  }
}
function corridorAvg() {
  if (!state.corridor) return 0;
  const r = state.route.filter(p => p.t >= state.corridor.enterT);
  if (r.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < r.length; i++) km += distKm([r[i - 1].lat, r[i - 1].lng], [r[i].lat, r[i].lng]);
  const dt = (r.at(-1).t - r[0].t) / 1000;
  return dt > 3 ? (km * 3600) / dt : 0;
}
function updateCordUI() {
  const z = state.corridor?.z; if (!z) return;
  const avg = corridorAvg();
  const goneKm = distKm(state.corridor.enterPos, state.pos);
  const remain = Math.max(0, z.lenM - goneKm * 1000);
  if ($('corridor').hidden) $('corridor').hidden = false;
  $('co-name').textContent = z.name || z.nameEn || 'ممر متوسط السرعة';
  $('co-limit').textContent = 'حد ' + z.limit;
  $('co-avg').textContent = `${avg.toFixed(0)}`;
  $('co-avg').className = avg <= z.limit ? 'ok' : 'bad';
  $('co-remain').textContent = (remain / 1000).toFixed(2) + ' كم';
  $('co-len').textContent = (z.lenM / 1000).toFixed(2) + ' كم';
  $('co-fill').style.width = `${Math.min(100, (goneKm * 1000 / Math.max(1, z.lenM)) * 100)}%`;
}

/* ---------- alert engine ---------- */
let alertActive = false;
function alertEngine() {
  if (!state.pos) return;
  const items = state.pack.cameras.map(c => ({ ...c, type: c.type })).concat(state.pack.zones.map(z => ({ ...z, type: 'avg' })));
  let best = null;
  for (const o of items) {
    const geo = o.geo || o.corridor?.enter; if (!geo) continue;
    const d = distKm(state.pos, geo);
    if (d > state.opts.preDist / 1000) continue;
    if (!best || d < best.d) best = { o, d };
  }
  if (!best) { if (alertActive) { alertActive = false; $('alert').hidden = true; } return; }
  const { o, d } = best;
  const lim = o.limit ?? null;
  const pct = state.opts.threshold === 'pct';
  const thr = pct ? (o.limit || 60) * 0.1 : state.opts.threshold;
  const over = lim ? state.speed - (lim + thr) : 0;
  const secs = Math.max(1, Math.round((d * 1000) / Math.max(20, state.speed) / 3.6));
  const key = d < 0.18 ? 'cam_passing' : (d < 0.35 ? 'cam_150' : (d < 0.55 ? 'cam_300' : 'cam_500'));
  // escalate only on state change
  const tk = `${o.id}_${key}`;
  if (!state.voiced[tk]) {
    state.voiced[tk] = 1;
    speak(key);
    drawAlert(o, key, d, over);
    if (state.opts.vibe && navigator.vibrate) navigator.vibrate(over > 0 ? [120, 70, 140] : [40]);
  }
  if ($('alert').hidden) drawAlert(o, key, d, over);
  if (over > 0 && state.opts.flash) flashOverlay();
  alertActive = true;
  setTimeout(() => { if (alertActive && d > state.opts.preDist / 1000) { alertActive = false; $('alert').hidden = true; } }, 1200);
}
function drawAlert(o, key, d, over) {
  const lines = {
    cam_500: 'بالك 🧿 كاميرا بعد 500 — خفّف',
    cam_300: '٣٠٠ للكاميرا يا زلمة، خصّ شوي',
    cam_150: '١٥٠ على الكاميرا — آخر فرصة',
    cam_passing: 'الكاميرا هون 📸 ابتسم وعدّى بطيخة',
  };
  $('ac-ico').textContent = GLYPH[o.type] || '🧿';
  $('ac-title').textContent = o.name || o.nameEn || 'كاميرا';
  $('ac-sub').textContent = (lines[key] || '') + (over > 0 ? ` · فوق الحد ${Math.round(over)} كم/س` : ` · عندك ${Math.round(state.speed)}`);
  $('ac-dist').textContent = `${d < 1 ? Math.round(d * 1000) + ' م' : d.toFixed(1) + ' كم'}`;
  $('ac-dir').textContent = 'اتجاه ' + Math.round(bearing(state.pos, o.geo || o.corridor?.enter)) + '°';
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
      const items = state.pack.cameras.concat(state.pack.zones.map(z => ({ ...z, type: 'avg' })));
      for (const o of items) {
        const geo = o.geo || o.corridor?.enter; if (!geo) continue;
        const d = state.pos ? distKm(state.pos, geo) : null;
        if (d != null && d < 3) near.push({ o, d });
      }
      near.sort((a, b) => a.d - b.d);
      html = near.slice(0, 6).map(r => `
        <div class="sh-row" id="r-${r.o.id}">
          <div class="ic">${GLYPH[r.o.type]}</div>
          <div><b>${r.o.name || r.o.nameEn}</b><small>${r.o.nameEn || ''} ${r.o.limit ? `· حد ${r.o.limit}` : ''}</small></div>
          <div class="d"><b>${r.d < 1 ? Math.round(r.d * 1000) : r.d.toFixed(1) + 'k'}</b><small>${r.d < 1 ? 'م' : 'كم'}</small></div>
        </div>`).join('') || `<div class="sh-empty">لا شي قريب يا زلمة — سير هدّي</div>`;
    }
    if (k === 'corrid') {
      html = (state.pack.zones || []).map(z => `
        <div class="sh-row"><div class="ic">📏</div>
          <div><b>${z.name || z.nameEn}</b><small>${z.lenM / 1000} كم · حد ${z.limit}</small></div>
          <div class="d"><b>${z.corridor ? (z.corridor.lenM / 1000).toFixed(1) : '—'}</b><small>كم</small></div>
        </div>`).join('');
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
  const q = $('search').value.trim();
  const rows = [];
  const items = state.pack.cameras.concat(state.pack.zones.map(z => ({ ...z, type: 'avg' })));
  for (const it of items) {
    if (state.filters !== 'all' && it.type !== state.filters) continue;
    if (q && !(it.name || '').includes(q) && !(it.nameEn || '').toLowerCase().includes(q.toLowerCase())) continue;
    const geo = it.geo || it.corridor?.enter;
    const d = state.pos ? distKm(state.pos, geo) : null;
    rows.push(`<li>
      <div class="t-ic" style="border-color:${{avg:'#3D5AF1',fixed:'#F0537E',light:'#F5A623',locality:'#2FBF71',bump:'#8A6B3A'}[it.type]}">${GLYPH[it.type]}</div>
      <div><b>${it.name || it.nameEn}</b><small>${it.nameEn || ''} · ${it.operator || ''}${it.limit ? ' · حد ' + it.limit : ''}</small></div>
      <div class="m-dist">${d != null ? `${d < 1 ? Math.round(d * 1000) + ' م' : d.toFixed(1) + ' كم'}` : '—'}</div>
    </li>`);
  }
  document.getElementById('list').innerHTML = rows.join('') || '<li>ما في نتائج بهذه الفترة</li>';
}
document.getElementById('search').addEventListener('input', renderList);
const fEl = document.getElementById('filters');
if (fEl) fEl.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  state.filters = b.dataset.f;
  [...fEl.children].forEach(c => c.classList.toggle('on', c === b));
  renderList();
});

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
  document.querySelector('.app').appendChild(t);
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
  $('btn-clear').onclick = () => { localStorage.removeItem('nz_opts'); localStorage.removeItem('nz_reports'); toast('تم الصفرين'); };
  $('btn-settings').onclick = () => go('settings');
  $('btn-list').onclick = () => go('list');
}

/* ---------- demo drive (scripted along Airport Rd) ---------- */
function startDemo() {
  const demoPath = [[31.9867, 35.9420], [31.9800, 35.9360], [31.9741, 35.9299], [31.9684, 35.9225],
    [31.9644, 35.9153], [31.9596, 35.9189], [31.9562, 35.9268], [31.9482, 35.9338], [31.9442, 35.9258]];
  state.demo = { i: 0, timer: null, speed: 90 };
  $('btn-stop').hidden = false;
  toast('ديمو: قيادة على شارع المطار — ركّب وسجّل التنبيه');
  state.demo.timer = setInterval(() => {
    const d = demoPath[state.demo.i]; if (!d) return stopDemo();
    state.demo.i++;
    state.pos = d;
    state.speed = Math.min(120, 60 + Math.sin(d[0] * 50) * 20 + 10);
    state.route.push({ lat: d[0], lng: d[1], t: Date.now() });
    if (state.route.length > 400) state.route.shift();
    dropMe(); drawHud(); tickCorridor(); alertEngine();
    state.map?.flyTo(d, 15, { animate: true, duration: 1 });
  }, 1400);
}
function stopDemo() {
  if (state.demo?.timer) clearInterval(state.demo.timer);
  state.demo = null;
  $('btn-stop').hidden = true;
  toast('الديمو انتهى 🧿');
}

/* window resize for leaflet */
window.addEventListener('resize', () => { state.map?.invalidateSize(); });
/* tab visibility — iOS silent web can't run bg GPS; surface the info */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.screen === 'home' && state.pos) {
    localStorage.setItem('nz_lastpos', JSON.stringify(state.pos));
  }
  if (document.visibilityState === 'visible') ensureAudio();
});
