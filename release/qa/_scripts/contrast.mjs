// Nazra QA — WCAG contrast: --ink2 (#9AA3B8) on --surf (#211D29), plus the other core pairs for context.
function srgb(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(hex) {
  const n = hex.replace('#', '');
  const r = srgb(parseInt(n.slice(0, 2), 16));
  const g = srgb(parseInt(n.slice(2, 4), 16));
  const b = srgb(parseInt(n.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const pairs = [['--ink2 #9AA3B8 on --surf #211D29 (QA target)', '#9AA3B8', '#211D29']];
const css = (await import('fs')).default.readFileSync('preview/app.css', 'utf8');
for (const m of css.matchAll(/--(ink|surf|warn|ok|bad)[0-9]*:\s*(#[0-9A-Fa-f]{6})/g)) {
  pairs.push([`--${m[1]} ${m[2]} vs --surf #211D29`, m[2], '#211D29']);
}
for (const [label, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  console.log(`${label}: ${r.toFixed(2)}:1  -> ${r >= 4.5 ? 'AA-normal PASS' : r >= 3 ? 'AA-large only (FAILS 4.5 for body text)' : 'FAIL AA-large too'}`);
}
