# STORE.md — store metadata kit (Nazra نظرة)

**Status: DRAFT — pre-submission.** No store listing exists yet. Every URL below is a
placeholder until the repo owner enables GitHub Pages / App Store Connect. Nothing in here
claims installs, revenue, or field-verification we don't have. Data claims are limited to what
the pipeline actually contains: **9 average-speed corridors + 177 cameras (101 fixed, 66
traffic-light, 6 checkpoints, 4 speed bumps)**, sourced from OpenStreetMap and GAM
(Amman municipality) April-2026 press releases. Entries carry `verified: false` unless
field-confirmed — the copy below reflects that honestly.

Brand palette (from `app/src/theme/tokens.ts`): Wadi Rum Night `#14131A`, Gerasa Stone
`#211D29`, Petra Rose `#F0537E`, Nazar Blue `#3D5AF1`, Dana Amber `#F5A623`, Ajloun Pine
`#2FBF71`. Character voice: **زيزو (Zeizo) من الزرقاء**.

---

## 1. iOS — App Store

### App name (≤30 chars — 12)
```
Nazra · نظرة
```
Check availability in App Store Connect before locking. Fallbacks if the name collides:
`Nazra — نظرة`, `نظرة Nazra Radar`.

### Subtitle (≤30 chars — this is 21)
```
الكاميرا قبل ما تشوفك
```
EN fallback subtitle (24 chars): `Camera alerts for Amman roads`

### Keywords (100-char field — this string is 86, verified by the generator's length check)
```
رادار,كاميرا,غرامة,مخالفة,سرعة,عمان,امتداد,شارع المطار,radar,jordan,amman,speed,camera
```
Rationale: these are the terms a Jordanian driver actually types — رادار / كاميرا / غرامة /
مخالفة dominate; عمّان and شارع المطار anchor the place; the English block catches tourists and
expats searching "radar Jordan" / "Amman speed camera". No spaces around commas (Apple counts
them). Verify the count again in the App Store Connect field — the field counter is the final
judge, not this document.

### Promotional text (≤170 — this string is 119, verified by the generator's length check)
AR (current default for Jordan storefront):
```
٩ امتدادات رادار و١٧٧ كاميرا بعمّان — تنبيه صوتي قبل الكاميرا، مش بعدها. مجاني، بدون اشتراك، وبدون إعلانات وقت القيادة.
```
EN:
```
9 average-speed corridors and 177 cameras in Amman — a voice alert before the camera, not
after. Free, no subscriptions, no ads while you drive.
```
Promo text can be updated without a new build — use it for corridor updates (e.g. "امتداد جديد
أُضيف لشارع المطار").

### What's New (initial release 1.0)
```
النسخة الأولى:
• ٩ امتدادات سرعة متوسطة و١٧٧ كاميرا — بيانات OpenStreetMap + تصريحات بلدية عمّان الكبرى (نيسان ٢٠٢٦).
• تنبيهات صوتية بصوت زيزو: ١٢ سطر بلهجة أردنية + ٦ بالفصحى.
• تقارير الكاميرات تتخزّن على جهازك — لا حساب، ولا خوادم بعد.
• خريطة ليلية بألوان وادي رم والبترا — محسّنة للقيادة بعد المغرب.

First release:
• 9 average-speed corridors, 177 cameras — OpenStreetMap + GAM Amman (Apr 2026) sources.
• Zeizo's voice alerts: 12 Jordanian-dialect lines + 6 MSA lines.
• Camera reports stored on-device only — no account, no server yet.
```

### Description — Arabic (primary)
```
كاميرات عمّان قبل ما تشوفكها — هيدا كله حرفياً.

«نظرة» بتنبّهك على الكاميرا قبل ما توصلها — زيزو بحكي معك وانت سوّاق، وانته اهدى وخلّي عينك عالطريق.

يللي حاطينه قدامك:

▪ ٩ امتدادات سرعة متوسطة: شارع المطار، شارع الاردن، وغيرها — تم تنظيمها بعد تصريحات
  بلدية عمّان الكبرى (نيسان ٢٠٢٦).
▪ ١٧٧ كاميرا: ١٠١ ثابتة، ٦٦ كاميرا إشارات، ٦ نقاط تفتيش، و٤ مطبات.
▪ المصدر: OpenStreetMap + الأخبار الرسمية — مش تكهنات.
▪ علامة التحقق: كل نقطة عليها إشارة «محقّق ميدانياً» أو«للسا غير محقّق» — بنقولك
  الوضع بصراحة، ما بنزخرف.
▪ صوت زيزو من الزرقاء: «بالك 🧿 كاميرا بعد ٥٠٠» و«ابتسم وعدّى بطيخة» — ١٢ جملة بلهجتنا
  اروع ببلدنا، وكمان ٦ بالفصحى.
▪ لا اشتراك. لا إعلانات وقت القيادة. لا حساب.
▪ بلاغاتك تتسجّل على جهازك بس — حتى يتوفر خادم المجتمع، لا شيء بينتشر.

مهم النص بالآخر (لأن اللي بنكتبه عماني وصدق):
نظرة أداة معلوماتية. قيمة السرعة المعلنة هي «معلومة» مش «حكم قانوني» — غراماتك ومخالفاتك
نبّه القوانين الرسمية. نظّر، اهدى، واحكم على الطريق بعينك.
```
### Description — English
```
Amman's cameras, seen before they see you.

Nazra نظرة ("a glance") tells you about the camera ahead — before it flashes, before the
fine, before the surprise at the end of the month.

What you get:

▪ 9 average-speed corridors: Airport Rd, Jordan St, and more — organized after Amman
  municipality's April 2026 announcements about the new radar system.
▪ 177 cameras: 101 fixed, 66 traffic-light cameras, 6 checkpoints, 4 speed bumps.
▪ Sources: OpenStreetMap + official municipal press — not guesswork.
▪ Verified flags: every point is marked "verified" or "not field-confirmed". We'd rather
  show you an honest unknown than a confident guess.
▪ Zeizo's voice from Zarqa: "watch out 🧿 camera in 500" — 12 lines in Jordanian dialect
  plus 6 in Modern Standard Arabic.
▪ No subscriptions. No ads while driving. No account.
▪ Your reports stay on your device until a community server exists — nothing leaves your
  phone.

The fine print (because honesty is a feature):
Nazra is an informational tool. A displayed speed limit is information, not legal advice —
your obligations come from actual traffic law. Glance at the screen, ease off the pedal,
keep your eyes on the road.
```
Both descriptions above ~1.5–1.9k chars of the 4000 limit — headroom kept for local-content
updates. Remove/adjust the 🧿 emoji per store spelling rules if rejected.

### Categories
- iOS primary category: **Navigation** ; secondary: **Travel**
- Android category: **Maps & Navigation** (see §2)

### iOS Privacy Nutrition Label (declare at submission)
- **Location (coarse while-in-use)** — App functionality; not linked to identity; not used for
  tracking. This matches reality: location is read only while the app is foregrounded to
  compute corridor/camera proximity. No movement history leaves the device (there is no
  server to move it to).
- **Data Not Collected**: contacts/identifiers/diagnostics — honest today: none, zero
  analytics bundled, no crash reporter wired to a third party.

### Required URLs for the iOS listing
There is no domain yet. The practical free option is a **GitHub Page** enabled on this repo:

- **Privacy policy URL** → `https://<ORGANIZATION>.github.io/<REPO>/books/PRIVACY` — rendered
  from `books/PRIVACY.md` (enable GitHub Pages with Jekyll; markdown renders to HTML).
  Source of truth: `books/PRIVACY.md`.
- **Support URL** → the repo's issues page: `https://github.com/<ORGANIZATION>/<REPO>/issues`.
  Replace with a real support page when one exists.
- **Marketing URL** — optional; omit until a real landing page exists.

Apple reviews the URLs — publish before entering metadata, and keep the DRAFT fact
("بطاقة مسوّدة") or its English DRAFT note until the policy is the shipped one.

---

## 2. Android — Google Play

### Title (≤30)
```
Nazra نظرة — رادار عمّان
```
(23 chars incl. spaces/dots; EN fallback: `Nazra – Amman radar alerts`)

### Short description (≤80 — this string is 65, verified by the generator's length check)
```
تنبيه لكاميرات الرادار بعمّان قبل ما توصلها — مجاني بدون إعلانات.
```

### Full description
Reuse the §1 Arabic + English blocks. Play-specific swap: remove the "No subscriptions"
line's repetition from the what's-new; add one Play-relevant bullet:
```
▪ في نسخة ويب تقدّمية (PWA) بتتجرّبها من المتصفح بدون تثبيت — تطبيق Play هو النسخة الكاملة، والاثنين بنفس البيانات.
```

### Category
**Maps & Navigation**. Rationale: the product is a navigation/companion surface with a map +
proximity alerts, not a turn-by-turn router; Play shows route-companion apps there, and the
IARC/Play questionnaire maps to it cleanly. (Do NOT choose "Auto & Vehicles" — that's for
driving-hardware accessories, and it kills discovery.)

### Content rating rationale (IARC)
- No violence, gambling, user-generated *public* content (reports are device-local; nothing
  is shared to other users because no backend exists), no chat, no purchasing beyond the
  store itself. Expected outcome: **Everyone / PEGI 3**. Answer truthfully in the
  questionnaire — do not tick "enhanced physical activity / driving focus" unless the form
  explicitly asks about camera/radar warnings as a hazard category (Treat as navigation aid).
- Include the standard dataset disclosure: map data from OpenStreetMap (ODbL attribution),
  camera/corridor info from GAM April-2026 press releases and community reports — reviewed
  and marked verified / unverified.

### Play Data safety section (declare honestly)
- Data shared: **None** (no server yet, no third-party SDKs).
- Data collected: **Location** — collected in-session, not shared, not deleted-on-device-only;
  primary purpose "Navigation & alerts".
- **You must state "no data erased" truthfully**: users can wipe local reports in-app
  (Settings → مسح التقارير) or by uninstalling.

---

## 3. Screenshot plan (5 screens, both stores — responsive-first)

Hard rules:
1. **Final shots must be captured from the real app before submission.** The placeholder
   mockups exist in `release/store/screenshots/` (see the README there) — they depict real
   features, correct palette, honest camera counts; they are layout stand-ins, not captures.
2. Arabic UI is **RTL**: tabs, aligns, and progress bars mirror. English storefront pair can
   mirror LTR with the same shots.
3. iPhone canvas: **1179×2556** (6.7" Rt DPI). Android equivalents: 1080×2340, 9:16.
4. Overlaid wordmarks/logos must sit per Apple spec — keep margins anyway (no content <64px
   from edges beyond system bars).

| # | File (`release/store/screenshots/`) | Screen | Exact on-screen content (what must actually be visible) | Caption AR / EN |
|---|---|---|---|---|
| 1 | `01-map-corridors.png` | Map (home) | Dark map (Wadi Rum Night), Airport Rd corridor polyline in Nazar Blue, camera pins: fixed = Dana Amber dots, traffic-light = Petra Rose, verified ring = Ajloun Pine. Bottom corridor bar: `امتداد شارع المطار · ٦ كاميرات` + progress. Top-left chip: `بيانات OpenStreetMap + بلدية عمّان`. | `شوفت الكاميرا قبل ما تشوفها` / `The camera, seen first` |
| 2 | `02-alert-voice.png` | Live alert card | Center card Petra Rose border: title `كاميرا بعد ٥٠٠ م`, distance bar 500→150, speed gauge `الحد ٦٠`; voice bubble: `بالك 🧿 كاميرا بعد ٥٠٠ — خفّف ما تشوف الفلاش` attributed to زيزو from الزرقاء; small `verified` pill: `محقّق ميدانياً` on the verified one only. | `زيزو يحكي قبل الفلاش` / `Zeizo speaks before the flash` |
| 3 | `03-corridor-list.png` | Corridor list | RTL list header `الامتدادات — ٩ ممرات`: rows for `شارع المطار`, `شارع الاردن`, remaining `٧ امتدادات أخرى` with counts (`كاميرات ٢٣`, etc. — numbers straight from the data tables, not invented); trust pill: `بلاغات المجتمع (على جهازك)`; rows without field confirmation show the `غير محقّق` pill. | `كل امتدادات عمّان بقائمة وحدة` / `Every Amman corridor, one list` |
| 4 | `04-report-camera.png` | Report flow | Form: camera type selector `ثابتة · إشارة · حواجز · مطبات`, note sample `قرب دوار ٥` (generic), shield line: `بلاغك بيتخزّن على جهازك — لا خوادم بعد`, CTA Petra Rose: `بلّغ`. | `بلاغك على جهازك بس` / `Your report stays on your phone` |
| 5 | `05-voice-personality.png` | Voice & character | Voice selector: Zeizo card in Petra Rose highlight; dialect chips `١٢ أردنية · ٦ فصحى`; quote row from app.js: `أهلاً بك في نظرة يا زلمة — الكاميرا قبل ما تشوفك`; a "translate to MSA" toggle. | `صوت الزرقاء، مش صوت بوت` / `A voice from Zarqa, not a bot` |

Per-store variations:
- **iOS**: use tops of images without status bar (clean), add short device-free header text
  only on shots 1–2.
- **Android**: same five frames, 1080×2340; Play adds a feature graphic later
  (`TODO next tick: 1024×500 feature graphic per Google spec, same palette`).

--- 

## 4. What the human still has to do before hitting "Submit"

1. Enable GitHub Pages → publish `books/PRIVACY.md`/`books/TERMS.md` (fill `<ORGANIZATION>`/`<REPO>`).
2. Ship real screenshots from the app (§3); keep the generated mockups only as layout stand-ins.
3. Fill Apple Connecting/Play Console forms and run the IARC questionnaire honestly.
4. Voice "زيزو" personality has real recordings? — decide TTS-on-device vs pre-recorded per
   voice line; the store description doesn't claim anything beyond what's shipped.
5. Arabic copy sign-off from a native speaker — every Arabic string above was written for
   Jordanian register, but get one human read before it goes through keyboards/romanization
   on both licensing stubs.
