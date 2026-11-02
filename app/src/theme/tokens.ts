/**
 * Design tokens — single source of truth for color, spacing, radius, type scale.
 * ADM benchmarks resolved from research/brand.json. Efficient-file educational base only.
 * Never re-design here — consult research/brand.json winner rationale.
 */
export const appNameAr = 'نظرة';
export const appNameEn = 'Nazra';
export const appTagline = 'تفشش الثقة قبل الحدّ';

export const colors = {
  /* Nazra نظرة — palette from research/brand.json (brand.json → visual.palette)
     Wadi Rum Night 60 · Gerasa Stone 25 · Petra Rose 8 · Nazar Blue 4 · Ajloun Pine 2 · Dana Amber 1 */
  primary: '#F0537E',        // Petra Rose — CTA, alerts, camera flash
  primaryPressed: '#D43D68',
  accent: '#3D5AF1',         // Nazar Blue — bead iris, community-verified pins, trust accent
  warn: '#F5A623',           // Dana Amber — soon-events, low-data states
  critical: '#E14059',       // deep rose-red for flash events (keep distinct from warn)
  background: '#14131A',     // Wadi Rum Night
  surface: '#211D29',        // Gerasa Stone
  surfaceRaised: '#2A2438',
  border: '#332B45',
  textPrimary: '#EDEFF6',
  textSecondary: '#9AA3B8',
  textDisabled: '#5C6678',
  success: '#2FBF71',        // Ajloun Pine — passed-clean, streak alive
  mapOvernight: '#0E0D13',
  scrim: 'rgba(10,9,14,0.62)',
  streak: '#F5A623',         // 1% Dana Amber reuse for the بطيخة watermark on exports
};

/** Nazra voice system — Zeizo persona (Zarqa-core, Ammani slang default, MSA fallback).
    Loaded straight from research/brand.json → dialect_lines. Keyed to triggers. */
export const voice = {
  persona: 'Zeizo (زيزو) — 23, Zarqa Al-Zuhour, drives الكبش (hand-me-down Kia Cerato)',
  manifesto: [
    'الكاميرا تشوف الأرقام… ونحنا نشوفك أنت.',
    'بطيخة ع آخره: الحد مش عدوّك، هو حمّك.',
    'ما منحكي بصوت الحكومة؛ منحكي بصوت صاحبك في الكبسة.',
  ],
  rule: 'Real-incident pushes carry zero jokes. Ever.',
  jordanian: {
    cam_500: 'بالك 🧿 كاميرا بعد 500 — خفّف ما تشوف الفلاش',
    cam_300: '300 للكاميرا يا زلمة، خصّ شوي',
    cam_150: '150 على الكاميرا — آخر فرصة، اهدى',
    cam_passing: 'الكاميرا هون — ابتسم وعدّى بطيخة',
    cam_passed_clean: 'عدّيتها بصافي يا زلمة — متابعه 🧿',
    cam_passed_flash: 'عدّيتها يا بطل — خفّف بالجاي لا تقهر',
    speed_no_cam: 'شو هالسرعة يا زلمة؟ ما في أسرع من الغرامة',
    cop_report_incoming: 'ضبطة على 2 كم يا زلمة — نخفف',
    report_thanks: 'بلاغك وصل زلمة — نظرة بتفكر الحسنات',
    hazard_report_incoming: 'بلاغ: حادث بعد 1 كم — اترك مسافة',
    first_launch: 'أهلاً بك في نظرة يا زلمة — الكاميرا قبل ما تشوفك',
    streak_day_kept: 'يوم نظيف — السلسلة صارت بطيخة زايدة',
  } as Record<string, string>,
  msa: {
    cam_500: 'تنبيه: كاميرا على بعد 500 متر. يُرجى ضبط السرعة.',
    cam_300: 'كاميرا على 300 متر. التزم بالحد.',
    speed: 'تجاوزت الحد المسموح. يُرجى خفض السرعة.',
    pass_clean: 'انتهى منطقة المراقبة. تابع الحد إن رغبت.',
    hazard: 'تحذير: حادث ممكن يؤثر على السرعة.',
    zone_enter: 'دخلت منطقة متوسط سرعة.',
  } as Record<string, string>,
};

/** Fonts — display + body per brand.json → visual.typography */
export const fonts = {
  display: 'Changa-Bold',          // 700/800 glyphs — numerals in the speed dial
  body: 'IBM Plex Sans Arabic',    // body copy; Readex Pro = tight-bundle variant
};

export type TextVariant = 'display' | 'headline' | 'title' | 'body' | 'label' | 'micro';

/**
 * Type scale, 1.2 ratio anchored on body 15.
 */
export const typeScale: Record<TextVariant, { fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600' | '700' | '800'; fontFamily?: string }> = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800', fontFamily: fonts.display },
  headline: { fontSize: 24, lineHeight: 30, fontWeight: '700', fontFamily: fonts.display },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600', fontFamily: fonts.body },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400', fontFamily: fonts.body },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '500', fontFamily: fonts.body },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '500', fontFamily: fonts.body },
};

/** Base 4 spacing grid; index n === n*4 px. */
export const spacing = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

/** Semantic layout constants shared by every screen placeholder. */
export const layout = {
  screenPaddingX: 16,
  cardPadding: 16,
  tabBarHeight: 56,
} as const;
