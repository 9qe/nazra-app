# release/store/screenshots/ — store screenshot assets

**Status: pre-submission stand-ins, NOT final captures.** These five 1179×2556 PNGs were
generated programmatically (`release/assets/gen_nazra_assets.py`, PIL + arabic-reshaper +
python-bidi + Arial on Windows). They depict **the product's actual features and real
data** — they are not screenshots of the running app and must not be submitted to the
stores. Before App Store / Play submission, replace them with captures from the real PWA
(`preview/`) or the native iOS app (`app/`), per `books/STORE.md` §3.

## What each mockup depicts (all real product content)

| File | Depicts | Honesty anchors |
|---|---|---|
| `01-map-corridors.png` | Dark map home: corridor polyline (Nazar Blue), camera pins (fixed amber / traffic-light rose, green = field-verified), legend chips, bottom corridor bar | Counts straight from the data: 101 fixed, 66 traffic-light, 6 checkpoints, 4 bumps; source chip "بيانات OpenStreetMap + بلدية عمّان"; source chip reports local-only reality |
| `02-alert-voice.png` | Live alert card: "كاميرا بعد ٥٠٠ م", 500→150 distance bar, 60 limit block, Zeizo voice bubble | Voice line is the real `preview/app.js` line **"بالك كاميرا بعد ٥٠٠ — خفّف ما تشوف الفلاش"** (emoji 🧿 dropped in mockup — no color-emoji renderer); pill says "موقع تقريبي — بلاغ بلدية" because GAM press geo is approximate until field-verified |
| `03-corridor-list.png` | Corridor list, 9 corridors | Row names/lengths/limits are the REAL segments from `preview/data/radars.json` (خصر: شارع المطار ١-٣ + شارع الأردن ١-٢ shown, 7 more summarized); honesty footnote: only 2 of 177 cameras carry the field-verified flag |
| `04-report-camera.png` | Report flow: type chips (ثابتة/إشارة/حواجز/مطبات), fields, local-only notice, "بلّغ" CTA | "بلاغك بيتخزّن على جهازك — ما في خادم بعد" matches current reality (reports store on-device) |
| `05-voice-personality.png` | Voice selector: Zeizo card (from Zarqa), waveform, quote card, MSA toggle | Quote is the real `first_launch` line from `preview/app.js`; 12 Jordanian-dialect + 6 MSA lines matches the engine |

## Arabic rendering (how, and its limits)

- Shaped with `arabic_reshaper` + `python-bidi` (pip-installed this session) over
  C:\Windows\Fonts\arialbd.ttf / arial.ttf. Arabic in these PNGs is properly connected
  and RTL-ordered.
- Known limitation vs the real app: no color-emoji glyphs (the 🧿 nazar emoji in real
  copy is drawn as a bead motif instead, or omitted), and Arial shaping is
  functional-but-not-designer-grade. Final store captures from the real app will not
  have these limitations.
- All Arabic strings were written for Jordanian register; native-speaker sign-off is a
  required pre-submission step (see `books/STORE.md` §4).

## Regenerate

```
python release/assets/gen_nazra_assets.py
```

The script also prints the verified length checks for the store copy strings
(iOS name/subtitle/keywords/promo, Play title/short description) — keep those in sync
with `books/STORE.md`.
