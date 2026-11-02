'use strict';
// Nazra نظرة — minimal UI helpers: glyphs, Arabic numerals, distance strings,
// screen-reader announcements. No DOM beyond #sr-live inside announce().

export const GLYPH = { avg: '📏', fixed: '🛑', light: '💡', locality: '🚨', bump: '🐢' };

/** Arabic word for each camera type — used by the courtesy strip. */
export const TYPE_WORD = { avg: 'ممر', fixed: 'رادار', light: 'كاميرا إشارة', locality: 'ضبطة', bump: 'مطبّ' };

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Latin digits/decimal to Arabic-Indic ('60'->'٦٠', 1.2->'١٫٢'). Pass-through for others. */
export function toArNum(v) {
  return String(v).replace(/[0-9]/g, d => AR_DIGITS[+d]).replace(/\./g, '٫');
}

/** Distance (km) to a short Arabic string: '٤٠٠ م' / '١٫٢ كم'. */
export function fmtNear(km) {
  if (km == null) return '—';
  return km < 1 ? `${toArNum(Math.round(km * 1000))} م` : `${toArNum(+km.toFixed(1))} كم`;
}

/** Mirror a string into the aria-live region so toasts reach screen readers. */
export function announce(text) {
  const el = document.getElementById('sr-live');
  if (el) el.textContent = text;
}
