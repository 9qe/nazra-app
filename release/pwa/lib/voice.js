'use strict';
// Nazra نظرة — Zeizo voice port: Web Speech (ar) + WebAudio tones.
// The Arabic literals below are the product — do not re-write them; copy them
// character-for-character only. Import this in a renderer (browser) context.

/** Zeizo delicates — spoken lines (leverage emoji get stripped before TTS, not before beep). */
export const VOICE = {
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

/** MSA mirror (الإعدادات: عربي محكي). */
export const MSA = {
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

const SPEAK_MIN_MS = 900;

/**
 * Build the voice instance. Deps come from the host app so this module never
 * holds global state: getOpts -> state.opts, getCtx/setCtx -> AudioContext slot.
 */
export function createVoice({ getOpts, getCtx, setCtx }) {
  let lastSpoke = 0;

  function ensureAudio() {
    let c = getCtx();
    if (!c) {
      c = new (window.AudioContext || window.webkitAudioContext)();
      setCtx(c);
    }
    if (c.state === 'suspended') c.resume();
    return c;
  }

  function beepFor(key) {
    const opts = getOpts();
    if (opts.voice === 'tts' || opts.voice === 'off') return;
    const c = ensureAudio();
    const p = {
      cam_150: [880, 660, .14, 3], cam_300: [720, 580, .13, 2], cam_500: [640, 520, .14, 1],
      speed_no_cam: [1100, 900, .1, 2], zone_enter: [440, 400, .2, 1], zone_exit_ok: [520, 780, .18, 2],
      zone_exit_bad: [400, 300, .2, 3], cam_passed_clean: [560, 840, .16, 2],
    }[key] || [640, 480, .15, 1];
    const [f1, f2, dur, n] = p;
    const t = c.currentTime;
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = i % 2 ? f2 : f1;
      g.gain.setValueAtTime(0.09, t + i * dur);
      g.gain.exponentialRampToValueAtTime(0.01, t + (i + 1) * dur);
      o.connect(g).connect(c.destination);
      o.start(t + i * dur); o.stop(t + (i + 1) * dur);
    }
  }

  function speak(key) {
    const opts = getOpts();
    const m = opts.msa ? MSA : VOICE;
    const line = m[key] || m.cam_500;
    const now = Date.now();
    if (now - lastSpoke < SPEAK_MIN_MS) return;
    lastSpoke = now;
    if (opts.voice !== 'tts' && opts.voice !== 'both') return;
    try {
      const u = new SpeechSynthesisUtterance(line.replace(/[🧿📸🚨🔴🙏🍉👀]/g, ''));
      u.lang = 'ar-JO';
      const vs = speechSynthesis.getVoices();
      u.voice = vs.find(v => v.lang === 'ar-JO') || vs.find(v => v.lang.startsWith('ar')) || u.voice;
      u.rate = 1.05; u.pitch = 1.1; u.volume = 1;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* lane 1 — speech engine unavailable */ }
    beepFor(key);
  }

  return { speak, beepFor, ensureAudio };
}
