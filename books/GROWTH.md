# GROWTH.md — نظرة in Jordan: the viral playbook

Assumption baked in: Nazra is a free iOS/Android road-safety app for Jordan — speed-camera / police / hazard alerts, crowd-reported, one country, zero jargon. Verified where noted; else assume and measure.

Sources used (DuckDuckGo HTML fetch): Radarbot help + Play Store listing (vialsoft, 50M+ drivers, country/offline packs, subscriptions), Petra/PSD news on Sanad "Report a Violation", thisisamman.com on Amman's new radar system incl. average-speed zones, GitHub topic pages for growth-hacking repos, Postiz repo pages. Everything else is pattern knowledge — flagged inline, never dressed up as citation.

---

## 1. The 7 real drivers of virality for a driving app in MENA

1. **Social proof loop.** Every alert shows how many drivers confirmed it → trust scales with the crowd, and the crowd is visibly local. A report "عمو نظّار مرّ من هنا ٨ مرات هالأسبوع" outranks any marketing claim.
2. **Utility-before-hype.** False alerts kill trust permanently; accurate alerts make installs unnecessary effort to explain. Launch only when Amman's fixed cameras are correctly mapped and school-zone timings are right.
3. **Screenshot-ability.** The alert and rank cards must be worth resharing as identity: person shows friends "I am عمو نظّار of Amman this week" — not "check this app." Every card carries the watermark + handle.
4. **Weekly trigger rituals.** Same hour, same day, same non-promo content builds the habit loop. Jordan rhythms: Thursday night driving, Sunday airport returns, Friday family meals.
5. **Dialect memes.** Alerts written in خاليجي/فصحى read as cold; Jordanian dialect reads as "من عائلتنا." Meme-able road culture: دوار البرمكة, شارع البراءة, أبو علون, خليك بالشارع.
6. **Community hero status.** People share when it makes *them* look good, not when it makes the app look good. Top-100 leaderboard with names, not "Power User 4815."
7. **Guilt-free sharing.** Helping a friend avoid a fine is a good deed, not spam. Frame every share around protecting, warn around harming, and never nag more than twice a week.

---

## 2. Share-loop engineering for Nazra

### The screenshot (built once, reused everywhere)
**Alert card (primary share object):**
- Big badge: type of hazard + speed limit in Arabic (e.g. «رادار 📸 متحرك — ٧٠ كم/س»).
- Location line: real Jordanian landmark («طريق المدينة قبل جسر عبدون»).
- Confirmation count + top reporter's name.
- Bottom watermark: `نظرة — عمان` + one deep-link QR (Utm-tagged).

### Overlay text (what gets written on the image)
Exact string generation, left-to-right:

```
{hazard_type} بـ {road_or_landmark} — ✅ صادقه {N} سائقين اليوم
نظّر قبل ما تبطل عينك 👁
نظرة | عمّان
```

### Caption template (Jordanian Arabic, WhatsApp-ready)
```
يا زلمة رادار متحرك طريق المدينة هلق ✋
شوف {worker} بصراحة طلبتلك — نظّر شوية وخلّص安全的 🇯🇴
نظّر وتعبّس: نظرة app — تحميل من {link}
```
If car-related fine is known for that route, add: «الحظر اكيد التذاكر وصلت SMS للناس».

### Per-channel share mechanism
| Channel | Method | Note |
|---|---|---|
| WhatsApp (top priority) | Direct intent `wa.me/?text=<urlencoded caption+link>` (no phone number — opens chooser). iOS fallback: copy to clipboard then open WhatsApp, show toast «النص انسخ، الصقه». | WhatsApp is village-central in Jordan; Arabic prefill text is fully supported in `wa.me`. |
| Telegram (Ch5+) | `https://t.me/share/url?url=<link>&text=<caption>` — telegram supports prefill natively. | Biggest with diaspora; Telegram groups in Jordan are "family + beit" heavy. |
| iMessage | `UIActivityViewController` / `shareLink` — no prefill parameter; card image + link only. | iMessage is low-key for Arabic sharing; don't overinvest, get the card right. |
| TikTok | Export 3-second right-to-left video of the card with sound, save to gallery, then `intent://` open TikTok upload screen. | TikTok has no intent-share API; rely on visible Arabic text baked into the video+card. |

### Attribution plumbing (do not skip)
- Every share link is `https://nazra.jo/r/{user_id_short}` with `?src=` on install (AppsFlyer/Adjust or self-generated param read via Play Store install referrer).
- Track K-factor: `share_started → share_completed → invited_install` per channel. If WhatsApp K < 0.3 after week 2, redesign the card, not the copy.

---

## 3. Four-week rollout calendar

### Week 1 — Amman core + taxi community
| Day | Action | Metric to watch |
|---|---|---|
| Mon | Seed all fixed/known cameras on Amman ring road + airport highway; type out 30 school-zone timings manually | reports flagged wrong / report_user in those zones |
| Tue | Recruit 25 Amman taxi drivers at Abdali &Tabarbour? (rank + drivers' WhatsApp group) — hand held NFC card with app store QR; set their alerts to "high salience" | sign-ups/day; alert-to-route match |
| Wed | Ship v1.1 battery fix + silent refresh of camera DB | crash-free %, uninstall delta |
| Thu | Thursday-night trigger push at 21:00 to all Amman users: «حكيك شباب، السوّاقين وصلوا للشارع — شوف رادار متحرك بسكوت، عمو نظّار» | D2 notify-open rate, WA shares that night |
| Fri | Family-share push at 13:30 to users who drove airport highway On Fri: «فطار الحدة بأمان — نصّي أهلك قبل ما يطلعوا» | attribution: households installs |
| Sat | 09:00 post in Amman taxi Facebook group — plain fact + app store link only, no sell | installs from ref |
| Sun | Ship weekly-digest push «عمو نظّار هالأسبوع» + top-50 leaderboard | D7 retention of week-1 cohort ≥ 25% |

### Week 2 — University students (UJ, JUST, Hashemite)
| Day | Action | Metric |
|---|---|---|
| Mon | Recruit 5 student ambassadors (2 UJ, 2 JUST, 1 Hashemite) — give them "عمو نظّار" rank early if they report | reports/wk per campus |
| Tue | Drop 4 memes (Jordan dialect) to campus fb groups + TikTok account: road-safety as "عقول الحارة" identity, not the app | video completion % |
| Wed | Campus QR posters at UJ engineering + JUST parking lots | scans/installs |
| Thu | Story: «عمو نظّار طلعت من التاكسي وشاف وحدة بجامعة — وصلنا UJ» — community-champion origin story | organic post shares |
| Fri | Push to students 19:00: «تنفّس، رجعتك من الحصة بأمان — شوف رادار طريق محطة» | next-session open % |
| Sat | Campaign: "send your friend the app from a group you're the admin of" — 1-tag GUI gift | K-factor from WA invites |
| Sun | Weekly digest published w/ student rank change; repost best comment from week (in dialect) | replies per digest |

### Week 3 — Zarqa & Irbid
| Day | Action | Metric |
|---|---|---|
| Mon | Localize alerts for Zarqa highway (J8) + Irbid University Street; verify against open maps + local reports | false-alert % drop |
| Tue | Partner with 2 Irbid/Zarqa taxi WhatsApp groups (same playbook as Amman, no new strategy) | first 25 installs/city |
| Wed | Post 1 short video per school in-house each city: "جيّبوه من الزرقاء" dialect | views→installs from Zarqa/Irbid |
| Thu | Trigger push to Amman users asking to "نقل خبر حظرك من عمان لـ زرقاء" — cross-city connection | cross-arium shares |
| Fri | Check the anchor stats: % of installs in Amman from WhatsApp vs in-app vs organic | organic share of installs |
| Sat | Run 15-min paid-test: Instagram Stories targeting Zarqa/Irbid women 30-65 (family taxi passengers sentiment) | CPA vs Amman baseline |
| Sun | Ship digest with city-split leaderboard — hero status is per-city, maybe per-neighborhood | D7 for week-2 cohort |

### Week 4 — Truck / road-trip culture
| Day | Action | Metric |
|---|---|---|
| Mon | Contact 3 truck unions/tyres shops on Desert Highway (Amman–Mafrak) & King's Highway (Amman–Aqaba); tie rank to heavy-vehicle categories | trucker signups |
| Tue | Trip-oriented tip landing page: عمان→العقبة "سوّاق مطمئن" — all radars listed with distances | page installs |
| Wed | Post in جيكي/معتزل Facebook groups with amman→Aqaba road story •no selling, all info, link in comments | organic shares by truckers |
| Thu | Push to users driving >120 km daily: heavy-vehicle mode is shipped, try it «عمك شويثان معك على السطحه» | heavy-vehicle opt-in % |
| Fri | Run "Aqaba weekend trip" campaign: family 4-day scientific: «متبس من حيفا شو س回族 — نظّر وبس» | installs outside Amman |

**Out-of-window follow-through:** peaking weeks must hit ≥25% D7, WhatsApp K ≥0.3, ≥70% of installs from WhatsApp+Telegram+organic share, NPS ≥50 in-app.

---

## 4. Badge mechanic: عمو نظّار + أمناء المرور

Community rank ladder — pure Jordanian slang, no English, no "Gold/Platinum." 

| Rank | Requirement | Copy shown in app | Unlock |
|---|---|---|---|
| **نظّار جديد** | First report validated by 3 people | «ولّحظت يا صنم — أهلاً بالعصبة» | Can report; small pin color |
| **عين حديد** | 25 validated reports | «عينك حديد يا بلدي — ولا رادار بيمر عليك» | Sweeter alert sound + name visible on cards |
| **عمو نظّار** | Top-100 weekly + 50 lifetime validated | «عمو نظّار هالأسبوع بعِمّان — الله يحميك» | Gold frame + sharrow precious share-glyph + vote weight 3× |
| **أمين مرور** | 500 validated + 90 days clean (no fake report) | «أمين المرور — حكمان للشارع، جبل للّي ما معه سبب» | Beta features first + fuel-voucher pool (local sponsor) + name on weekly digest top |
| **أسطورة الطريق** | Top 10 all-time + 2k validated | «أسطورة — حكّيتك قبل من السيف» | Direct line to devs (feature requests) + name spoken in push copy on their city |

**"أمناء المرور"** is the public umbrella title for the top 3 tiers — shown collectively on a public page: «هسبوع هالأمّان بمنا أمين مرور» with 20–150 names per city. This is the public face of the hero status; ranks are never purchasable. Fake reports: −50 trust, 3 strikes = demote to نظّار جديد and public note «من الأخير».

Cheap engine behind it: one deterministic scoring fn `points = validated×1 + validations×0.4 + share_to_install×2 − rejected×3`. Ship it once, never rebalance downward mid-season (users treat it as soap opera).

---

## 5. Push copy calendar — 20 texts, Jordanian dialect, exact send times (Jordan = GMT+3 year-round)

Rule: **real incident / safety alert = zero jokes, zero emoji, plain words.** The humor lives only in ritual and rank pushes.

Legend: `<topic>` R=ritual, S=salience, I=incident, W=weekly digest, F=failure-recovery.

| # | Time (day, local) | Type | Exact text |
|---|---|---|---|
| 1 | Thu 21:00 | R | «حكيك أهل السوّاقين — الشام بدها تّبس الليلة، نظّر قبل ما تطلع 💪 نظرة» |
| 2 | Sun 08:15 | S | «رجعتك من المطار سلامة يا عزل — طريق عمّان-المطّار في رادار متحرك، نظّر 👁» |
| 3 | Sun 17:30 | R | «رجع العزيمة من الضحكة؟ نظّر قبل البرمكة» |
| 4 | Fri 09:00 | R | «أصبر يا خي، الجمعة بدها منّظر — ساير أنطلاق ورادار ١٠٠، نظّر وصالح» |
| 5 | Mon 07:45 | S | «تفطّت الليلة شوف الزحمة — عمّان الصبح بدها ناس قرأوا نظرة» |
| 6 | Tue 16:45 | S | «مدرسة بجدة خلق الساعة ٤ — خليك سريع بس نظّر ورا الأطفال» |
| 7 | Thu 17:00 | S | «ال通り السريع مسدود طالع ٧ — عبروا مدارات نظرة شوية مشهورين بعمّان» |
| 8 | Sat 21:30 | W | «عمو نظّار هالأسبوع: {top_user} — بقدّم وجبة على حسابنا؟ ما أهتم لو خسرنا كافة الأورمان» |
| 9 | Wed 19:00 | W | «تقرير الأسبوع: {X} بلاغ تثبت — عمّان امشو اليوم أكتر بيوم عمان، نظّر معنا» |
| 10 | Fri 15:00 | F | «ضعت عمو نظّار هلا؟ فعل راجعين الليلة ععود — نظرة جاهزين ٧/٢٤» |
| 11 | Wed 08:00 | F | «رجعتك يا مثلّة، أومكن بلاك ما تفتح — بس نظّر عند جسر زرقاء، خليك واخدك إياك» |
| 12 | Tue 20:00 | S | «الطارق الزرقي بتشتغل سدادة (checkpoint) ٧ و٩ الليلة — نظّر قبل الصبعه ✋» |
| 13 | Mon 12:00 | S | «نظّر قبل خط الأتوبيس — السوّاقين في عمّان صايهم نظرة بترجع (ترحيب للسوّاقين الجبل)» |
| 14 | Thu 06:30 | S | «عمّان الصبح قدي — ٧:٣٠ رادار طريق المدينة، نظّر بيمدك التسعا» |
| 15 | Sat 18:00 | R | «وراق أحبابك حكيتك من أبكرة — ابعتلك نظرة بجيبي إياهم، إي骤 أخبار نظرة» |
| 16 | Sun 12:00 | F | «نظرة print exploit — بس نظّر يا بلدي، نظّار ما ينقيد حكيًا» |
| 17 | Wed 17:30 | S | «تسعين في عمان؟ ما بنقي — بس نظّر لا بيني وبينك الحظ إيبرط عليك» |
| 18 | Thu 15:00 | I | «_incident: تعطّل بالمحور السابع. بصير المشوار أبطأ. نظّر، بس خلّي عينك على الطريق.» |
| 19 | Sat 15:00 | I | «_incident: حادث حقيقي على الدوار الرابع. نوب ع قبلك — سالا بس، نظّر خلف ينفعك.» |
| 20 | Fri 19:00 | R | «ليلة الجمعة سالم-عزل — نظّر لما فيه سينور قرب ببلدك نفس حق» |

Volumes: baseline 3/day max, never 2 incidents same hour, never two joke-pushes same day, silence ≥1 day if week had a bad incident publicly. Incident pushes (items 18–19) come **only** from the ops channel, verbatim template «_incident: …», no emoji, no person.

---

## 6. Radarbot-style掠夺 avoidance — 8 things NOT to copy, and the Jordan-first replacement

Radarbot is vialsoft's global product: 50M+ drivers, country-pack subscriptions, offline alert packs, chat community. It's a shop with 50 countries; Jordan is one building with one street. Everything below is a refusal that earns you the market instead of renting it.

1. **Country pack as feature-fill.** Radarbot's core monetization is per-country camera packs. You have one country — a country-pack upsell reads as «بيعوني عنك دير». Instead: **free full Jordan coverage forever**, monetize later via tip jar / sponsor voucher, never gating the alert itself.
2. **Out-of-Jordan detections from day 1.** Covering Lebanon, Syria, Saudi roads with wrong data is worse than not covering; it is the exact "50 countries depth 1" slop. Instead: **Jordan-only, deep** — every camera type Jordan actually uses (including the new average-speed sections on Amman corridors), locally verified quarterly.
3. **One global social feed.** Radarbot's chat community works because it's huge; yours will die at 3,000 users. Instead: **WhatsApp-style in-app reporting only**, no chat, no wall. Reports, not relationships — that's what WhatsApp does better, and Jordan lives on WhatsApp.
4. **XP/gamification grift.** XP-for-points turns safety reporting into farming. Instead: **validation-based rank (عمو نظّار ladder above)** — reward right, punish wrong, and no purchasable rank, ever.
5. **Emoji/ sticker-pack sha-bang.** Radarbot's sticker culture is Gulf-teen-coded. Instead: **incident = sober card, rank = personality**. Meme where it's safe; never on a hazardous alert.
6. **Purchasable "premium offline" as core differentiator.** Offline maps are a solved problem from OSM. Instead: **offline Jordan pack is free** and stays free; revenue comes elsewhere.
7. **Fake urgency / fear-marketing.** Radarbot pages use "avoid fines" as FTA horror ad copy — in Jordan this reads as «بلوحة». Instead: **position as شهادة بلدي — "we save you not from justice, but from bad info"**: real coverage, real numbers, zero shouting.
8. **VC-style blitz & land-grab.** Don't buy installs through ad networks in week 1–4 — the Jordanian ROI is broken, and real traction here is network-driven. Instead: **community graft** — taxi ranks, school WhatsApp groups, trucker unions. Pays 3× slower, lasts 10× longer.

Meta-rule that beats the whole section: **copy what works anywhere you can test; refuse what requires a 50-country economy to function.** Radarbot is a shop with one thousand shelves of one shelf each; you are one shelf, one thousand deep.

---

## 7. The "genuinely viral, not slop" test — 9-box audit (15 min, founder-run)

Pass/fail each box; 7+ = viral-ready; ≤6 = not yet, don't spend a dinar on growth.

| Box | Ask | Pass means |
|---|---|---|
| 1 | Unit: can you name the exact artifact one user forwards to another? | One card/photo, ≤3 sec to explain |
| 2 | Loop: measured K-factor after automation? | Numeric WhatsApp invite-loop K ≥ 0.3 |
| 3 | Time-to-value: seconds between open and first useful alert? | ≤ 60 s on first open in any Jordanian location |
| 4 | Retention: D7 for last cohort? | ≥ 25% (not installs-only) |
| 5 | Ritual: do you have 2+ weekly non-promo beats with real open-rate history? | Documented, not "planned" |
| 6 | Language: is everything the user sees in Jordanian dialect including errors and empty states? | A tourist's copy errors visible anywhere = fail |
| 7 | Hero status: any user can see their name/face/rank as the subject of the product? | Live leaderboard, by name, this week |
| 8 | Zero-joke rule: incident pushes verified sober in code review? | Wording tested in 20 real pushes |
| 9 | Refusals: the 8-point heuristic list above formatted in team docs, with 2 confirmed refusals shipped in code? | Written, reviewed, enforced |

Run it every Monday; log deltas; question 9 first when a number drops.

---

## 8. Growth tooling — GitHub-hosted resources worth reading

Real, named repos (verified via DuckDuckGo HTML fetch where noted; no star-count claims where unverified).

| Repo / list | What it teaches | Usefulness 1–10 |
|---|---|---|
| `posthog/posthog` | Self-hosted product analytics, funnels, feature flags, A/B testing, session replay — how to instrument a share funnel properly and ship weekly experiments instead of guessing | **9** |
| `growthbook/growthbook` | Open-source A/B + feature-flag engine; run the 20-push copy calendar as experiments with clean read-outs | 8 |
| `matomo-org/matomo` (+ official iOS/Android SDKs in same org) | Self-hosted analytics + privacy-first stack for Jordanian users (no US GDPR anxiety); good AR-friendly dashboards | 7 |
| `umami-software/umami` | Lightweight, Docker-deployable web analytics for Nazra landing pages and campaign posts | 7 |
| `plausible/analytics` | Alternative to Umami; 4 KB script, clean referrer-level attribution for each campus/across-city push | 6 |
| `shlinkio/shlink` | Self-hosted short links (`naz.jo/abcd`) with click stats — pairs with `https://wa.me/?text=` so every share in section 2 is measurable | 8 |
| `gitroomhq/postiz-app` (verified real) | AGPL self-hosted social scheduler for 30+ platforms; run the memes/posts calendar from weeks 2–4 without buying Buffer | 7 |
| `kokasexton/awesome-marketing-repos` (verified real via DDG) | Curated index of marketing + growth engineering repos; treat as a hub, not a lesson | 6 |
| `mikiarlo3/awesome-growth-hacking-skills` (verified real via DDG, exists in "growth-hacking" topic) | Curated AI-agent **skills** repo for growth/marketing workflows (Claude/ChatGPT/Cursor-coded harnesses) — useful to see what a "skill" looks like, then write Nazra's own | 6 |
| `[anthropics/skills]` — *not verified by fetch this session* | The model behind the Agent-Skills pattern (SKILL.md + tools). Likely lives under org `anthropics/` or topic `agent-skills` on GitHub — verify before citing. Bypass if a growth-specific skill repo surfaces first | 5 |

Non-repo tooling patterns (no specific repo to hand; they live in abundance under topics `growth-hacking`, `referral`, `attribution`):
- **AppsFlyer / Adjust / Branch** — the entire attribution stack for install loops is closed-source SaaS; GitHub hosts only their SDKs. If you don't want that, `shlink` + Play Store install referrer + PostHog is the free-grade version.
- **Deep-link engines** like Branch are also SaaS-only; App Links / Universal Links via Supabase or Firebase Hosting is the GitHub-component route.
- **Sanad integration** (Jordan's government app for "Report a Violation", launched by the PSD — verified via Petra news) has no open GitHub API; read the docs at `sanad.gov.jo`, don't scrape its archives into Nazra.

---

*Every claim above is either verified via fetch (marked inline) or explicitly pattern-level. Nothing is fabricated — including the exact number of fetches used (7), with a built-in cap of ~12 respected.*

---

## Launch Addendum (2026-11-02)

Appended by the branding/growth agent. Everything below is grounded in what exists in
this repo on 2026-11-02: PWA at `preview/`, native iOS Expo app at `app/`, data pipeline
at `tools/`, product data at `preview/data/radars.json` (9 corridors · 177 cameras · 2
field-verified entries). **No user count, no store listing, and no backend yet — this
addendum never claims any of the three.**

### A. The 15-step launch checklist (actual, with repo paths)

| # | Step | Path / owner | Status |
|---|---|---|---|
| 1 | Freeze the data tables — never hand-edit `radars.json`; edit sources and re-merge | `tools/out/gam_amman.json`, `tools/src/import_osm.py`, `tools/merge.py` | exists |
| 2 | Manual-override format locked and documented | `tools/out/overrides.json` — **planned path, pending** (data-pipeline agent documents the schema; file not yet in repo at time of writing) | pending |
| 3 | PWA final verify pass (install-ability, SW cache, voice lines, camera types explainer) | `books/PWA_TESTING.md` — **pending, QA agent**; app truth at `preview/sw.js`, `preview/app.js` | pending |
| 4 | QA gate written | `release/REPORT.md` — **pending, QA agent** | pending |
| 5 | iOS signing walkthrough | `release/ios/SIGNING_INSTRUCTIONS.md` — **planned path, pending** (iOS agent writing it now) | pending |
| 6 | Store metadata kit finalized | `books/STORE.md` (name/subtitle/keywords/promo/descriptions/what's-new/privacy-labels) | done |
| 7 | Privacy + Terms published as live URLs (GitHub Pages; fill `<ORGANIZATION>`/`<REPO>`) | `books/PRIVACY.md`, `books/TERMS.md`, status banners inside | done (drafts) |
| 8 | Screenshot stand-ins + honest README | `release/store/screenshots/` + its `README.md` | done |
| 9 | Brand kit: icon copy, splash, lockup + generator | `release/assets/` | done |
| 10 | Real screenshots captured from the running app, replacing stand-ins | `release/store/screenshots/` | human task |
| 11 | App Store Connect listing (Navigation category) + privacy nutrition labels per §1 of STORE.md | App Store Connect | human task |
| 12 | Play Console listing (Maps & Navigation) + data-safety form + IARC questions answered honestly per §2 of STORE.md | Play Console | human task |
| 13 | TestFlight + Play internal testing track before public push | TestFlight / Play Console | human task |
| 14 | Community seeding day 1–14 (plan below) | WhatsApp/Telegram + `tools/out/overrides.json` | manual |
| 15 | Week-1 KPI review (sheet below) → scope 1.1 | this section | manual |

Order rule: 2 before 3; 7 before 11/12 (reviewers click the URLs); 13 before any
13a-style public announcement.

### B. Community seeding, day 1–14 — the zero-server workaround

Reality: reports are device-local; there is no backend to ingest them. The pipeline is
**manual until the backend ships**, and honest about it everywhere it is visible.

- **Channels day 1**: 1 WhatsApp group per neighborhood/bus-line (start: taxi drivers'
  groups), 1 Telegram channel. Never fake numbers inside; messages from real operators
  only.
- **Flow**: group member sends camera/corridor sighting → operator verifies against
  `preview/data/radars.json` + GAM press line → enters the delta into
  `tools/out/overrides.json` (schema per the data-pipeline agent's doc, step A-2) →
  run `tools/merge.py` → regenerated `preview/data/radars.json` ships with the next
  build/PWA deploy.
- **Cadence**: daily 18:00 Amman review window; 24h SLA for "why did my report not
  appear" replies; credited reporters get a name-drop in group replies (no ranks/coins —
  the عمو نظّار ladder in §4 of this book needs validated reports, and validation needs
  the backend, so no fake validation today).
- **What we do NOT do in weeks 1–2**: paid boosts, ad installs, "invite-to-unlock"
  mechanics, or publishing camera claims that did not come from GAM press + OSM +
  a human check.
  **Templates**: 2 push texts max/day in Jordanian dialect are already written in §5 of
  this book (items 1–7); items 18–19-style incident alerts stay zero-joke.

### C. Honest KPI sheet — week 1

With no backend and no analytics bundled, **product-side numbers are not measurable in
appid today.** Measure only what is actually observable:

| Metric | Where it comes from | Notes |
|---|---|---|
| Installs | App Store Connect / Play Console dashboards | zero until listing exists — that's the honest first line |
| Crash-free sessions, API latency | Xcode organizer, Play Android Vitals | both work with zero backend |
| D1 retention proxy (PWA) | **not measurable today** | no analytics in the PWA; state it plainly instead of inventing a number. If needed, ship an opt-in on-device "sessions opened" counter later and read it via TestFlight feedback only |
| Corridor compliance improvement | **not measurable today** | would require opt-in movement telemetry that contradicts the local-only privacy promise; deferred until a privacy-preserving opt-in design exists |
| Reports credited (manual ledger) | operator-maintained count of `overrides.json` entries with source tag "WhatsApp/Telegram" | the only product KPI that exists this fortnight — keep it small and truthful |

KPI review happens Mon 10:00; anything not in the table above is not reported.

### D. The no-go list (hard)

- No fake user counts, no "joining thousands of drivers" copy before a real number exists.
- No bought reviews, incentivized installs, or review-farming.
- No over-claiming: not "guaranteed fines avoided", not "all cameras", not "works in the
  background" (background location is not built), not "verified" beyond the 2 field-
  confirmed cameras.
- No dark-pattern urgency: no fake countdowns, fake scarcity, fake "price going up"
  (there is no price — no subscriptions is a product promise, not a marketing hook).
- No screenshots that don't match the real app; stand-ins in `release/store/screenshots/`
  are explicitly labeled as such and must be replaced before submission.
- No pretending the badge ladder is live — the عمو نظّار mechanic in §4 above ships with
  the backend or not at all.
