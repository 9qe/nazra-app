"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPEECH_LANG_MSA = exports.SPEECH_LANG_JORDANIAN = exports.SPEECH_RATE = void 0;
exports.mapAlertCopy = mapAlertCopy;
exports.alertHeadline = alertHeadline;
exports.impactClassFor = impactClassFor;
const tokens_1 = require("../theme/tokens");
const radarDataset_1 = require("../data/radarDataset");
/** expo-speech config: ar-JO voice, Zeizo tempo. */
exports.SPEECH_RATE = 1.05;
exports.SPEECH_LANG_JORDANIAN = 'ar-JO';
exports.SPEECH_LANG_MSA = 'ar';
/**
 * Corridor copy — mirrored character-for-character from the PWA's
 * preview/lib/voice.js (VOICE + MSA zone keys) so both platforms speak the
 * same lines. Same register: Zeizo Zarqa-core, zero jokes on real incidents.
 */
const ZONE_JO = {
    zone_enter: 'دخلنا ممر سرعة — متابِعنا لحد',
    zone_exit_ok: 'خلصت الممر — عدّيتها نظيف',
    zone_exit_bad: 'خلصت الممر — متوسطك فوق',
};
/** MSA fallback strings; tokens voice.msa already covers zone_enter. */
const ZONE_MSA = {
    zone_enter: tokens_1.voice.msa.zone_enter ?? ZONE_JO.zone_enter,
    zone_exit_ok: 'تم إجتياز المنطقة بشأن التزامك.',
    zone_exit_bad: 'تم تجاوز متوسط السرعة.',
};
/**
 * The spoken line for one alert event. Cameras resolve through the tokens
 * dictionaries (cam_500 … cam_passing); zone keys through the maps above.
 */
function mapAlertCopy(ev, dialect) {
    if (ev.pointType === 'zone') {
        const zoneMap = dialect === 'msa' ? ZONE_MSA : ZONE_JO;
        return zoneMap[ev.key] ?? '';
    }
    const dict = dialect === 'msa' ? tokens_1.voice.msa : tokens_1.voice.jordanian;
    const direct = dict[ev.key];
    if (direct)
        return direct;
    // dictionary gap (e.g. cam_150 missing in MSA) → descriptive Fallback line
    const label = radarDataset_1.TYPE_LABEL_AR[ev.pointType] ?? 'تنبيه';
    const dist = Math.round(ev.distM);
    const limitTxt = ev.limitKph != null ? ` الحد ${ev.limitKph}` : '';
    return `${label} على بعد ${dist} متر.${limitTxt}`;
}
/** Short on-card headline, dialect-free (dialect is the spoken line's job). */
function alertHeadline(ev) {
    if (ev.pointType === 'zone') {
        switch (ev.key) {
            case 'zone_enter':
                return 'مقطع متوسط السرعة';
            case 'zone_exit_ok':
                return 'القياس: عدّيت نظيف';
            default:
                return 'القياس: فوق الحد';
        }
    }
    const label = radarDataset_1.TYPE_LABEL_AR[ev.pointType] ?? 'تنبيه';
    return `${label} — بعد ${Math.round(ev.distM)}م`;
}
function impactClassFor(ev) {
    if (ev.key === 'zone_exit_bad')
        return 'error';
    if (ev.key === 'zone_exit_ok')
        return 'success';
    return 'warning';
}
