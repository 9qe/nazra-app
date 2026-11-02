# PRIVACY.md — سياسة خصوصية نظرة / Nazra privacy policy

> **الوضع: مسوّدة (DRAFT).** هذه النسخة معدّة للنشر على صفحة ويب (GitHub Pages مثلاً)
> قبل إرسال التطبيق للمتاجر. لا تقدّم رابطاً غير فعّال للمتاجر — فعّل Pages أولاً،
> وبعدها استخدم الرابط النهائي. ما بين `<>` لازم يتعبّى قبل النشر.

---

## سياسة الخصوصية — نظرة (بالعربي)

**آخر تحديث: ٢٠٢٦-١١-٠٢**

نظرة تطبيق معلوماتي بيقولك وين الكاميرات قبل ما تشوفها — وبسياسة خصوصية بنفس
بساطة الفكرة: **كل شي يتخزّن على جهازك.**

### ١. شو ما بنجمعه (البيانات اللي ما موجودة أصلاً)
- **حساب؟ لا.** ما في تسجيل دخول ولا إيميل ولا رقم هاتف.
- **خوادم؟ لا.** التطبيق ما بيكلم أي سيرفر. بلاغاتك وإعداداتك وموقعك ما بتطلع من
  جهازك — ما في تحليلات، ولا مزامنة، ولا نقل.
- **تحليلات؟ لا.** ما في Google Analytics ولا SDK إعلانية ولا عدّادات خارجية.
  ما بنعرف كم مستخدم فينا على أرض الواقع — وما لازم نعرف.

### ٢. الموقع الجغرافي
- الموقع بيتقرأ **بس وأنت فاتح التطبيق (foreground)**: المسافة بينك وبين الكاميرا
  بتتحسب عالجهاز لحظة بلحظة، وما بنخزّن مسارك — لا عندنا، ولا حتى على جهازك بعد
  ما يتحدّد التنبيه.
- **بالخلفية؟ لا.** نسخة الويب (PWA) بتعمل بالمتصفح وأنت فاتح الشاشة على iOS؛
  نسخة iOS الأصلية بطلب إذن «أثناء الاستخدام فقط» (while-in-use) — مش الخلفية.

### ٣. بلاغاتك
- بلاغ عن كاميرا أو تعديل بيانات بيتخزّن **محلياً على جهازك** لحتى يتوفّر خادم
  مجتمعي. التطبيق ما بيرفعه لأي حدا — لأنه ما في مين يرفعه لي.
- ما بنبيع ولا بنشارك أي معلومات عنك — ما في مشروع بيانات أصلاً إلنا نبيع أو
  نشارك منه.

### ٤. الإعلانات والاشتراكات
- ما في اشتراكات. ما في نظام إعلاني مركّب حتى الآن، وفي كل الأحوال **ما في
  إعلانات أثناء القيادة**. لو بيوم قرّرنا في رعاية أو إعلانات، هالسياسة بتتحدّث
  قبل ما تتفعّل الإمكانية.

### ٥. حذف بياناتك
- **من داخل التطبيق:** الإعدادات → «مسح البلاغات» بتمسح كل بلاغاتك المحلية.
- **بالإزالة:** حذف التطبيق بيمسح كل شي خزّنه نظرة، لأن كل شي محفوظ بمخزن
  التطبيق المحلي (local storage / sandbox).
- ما في حذف «من السيرفر» — لأنه ما في سيرفر بحفظ عنك أصلاً.

### ٦. الأطفال
- نظرة موجّهة للسواقين المرخّصين. ما فجمعنا بيانات أصلاً، فهو ما في شي خاص
  نعلّجه عن الأطفال.

### ٧. التواصل
- أسئلة الخصوصية: **TODO@example.com** — `<ضع الإيميل الفعلي قبل النشر>`.
- بلاغات تقنية: صفحة issues بريبو المشروع (`https://github.com/<ORGANIZATION>/<REPO>/issues` — الرابط النهائي بعد ما تتفعّل الصفحات).

### ٨. تغييرات هالسياسة
- إضافة خادم أو تحليلات أو إعلانات بتعني إعادة كتابة هالصفحة بتاريخ جديد —
  **قبل** ما تتفعّل الإمكانية، مش بعدها.

---

## Nazra Privacy Policy (English)

**Status: DRAFT.** Publish this as a live URL (e.g. GitHub Pages) before store
submission; do not hand reviewers a dead link. Fields in `<>` must be filled first.

**Last updated: 2026-11-02**

Nazra نظرة ("a glance") is a road-information tool. Its data model is deliberately
simple: **everything on your device, nothing on ours.**

### 1. What we do not collect
- **No account.** No email, no phone number, no sign-in.
- **No server.** The app does not talk to a backend today. Reports, settings, and your
  position never leave the device — no analytics, no sync, no transfer.
- **No analytics.** No third-party analytics SDKs, no ad SDKs, no cross-app trackers.
  We do not know how many people use Nazra — and there is no reason we should.

### 2. Location
- Location is read **in-session only, while the app is in the foreground**:
  distance-to-camera math happens on-device, moment to moment. We do not keep a travel
  log — not on our side, not even on your device once the alert has been computed.
- **No background tracking.** The PWA receives location only while the browser tab is
  open on iOS; the native iOS app requests "while-in-use" permission — never "always".

### 3. Your reports
- When you report a camera or a data correction, the report is saved **locally on your
  device** until a community backend exists. Today nothing is uploaded; there is no one
  to upload it to.
- We do not sell your data and we do not share your data — there is no data pipeline to
  sell or share from.

### 4. Ads & subscriptions
- No subscriptions. No ad system is implemented today, and **nothing is shown while you
  drive**. If sponsorship or paid features ever appear, this policy will be rewritten
  before the feature ships.

### 5. Deleting your data
- **In-app:** Settings → "مسح البلاغات" (clear reports) wipes your local report history.
- **Uninstall:** removing the app deletes everything Nazra had stored, because all of it
  lives in the app's local storage/sandbox.
- No server-side delete exists, because nothing server-side exists.

### 6. Children
- Nazra is aimed at licensed drivers. We collect no data, so there is nothing special
  to handle for children.

### 7. Contact
- Privacy questions: **TODO@example.com** — `<set the real address before publishing>`.
- Technical reports: the project's GitHub issues page
  (`https://github.com/<ORGANIZATION>/<REPO>/issues` — exact link after Pages is enabled).

### 8. Changes to this policy
- Adding a backend, analytics, or an ad program means rewriting this page with a new
  date — **before** the feature goes live, not after.
