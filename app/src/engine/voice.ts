import { voice } from '../theme/tokens';
import { TYPE_LABEL_AR } from '../data/radarDataset';
import type { AlertEvent } from './AlertEngine';

export type Dialect = 'jordanian' | 'msa';

/** expo-speech config: ar-JO voice, Zeizo tempo. */
export const SPEECH_RATE = 1.05;
export const SPEECH_LANG_JORDANIAN = 'ar-JO';
export const SPEECH_LANG_MSA = 'ar';

/**
 * Corridor copy — mirrored character-for-character from the PWA's
 * preview/lib/voice.js (VOICE + MSA zone keys) so both platforms speak the
 * same lines. Same register: Zeizo Zarqa-core, zero jokes on real incidents.
 */
const ZONE_JO: Record<string, string> = {
  zone_enter: 'دخلنا ممر سرعة — متابِعنا لحد',
  zone_exit_ok: 'خلصت الممر — عدّيتها نظيف',
  zone_exit_bad: 'خلصت الممر — متوسطك فوق',
};

/** MSA fallback strings; tokens voice.msa already covers zone_enter. */
const ZONE_MSA: Record<string, string> = {
  zone_enter: voice.msa.zone_enter ?? ZONE_JO.zone_enter,
  zone_exit_ok: 'تم إجتياز المنطقة بشأن التزامك.',
  zone_exit_bad: 'تم تجاوز متوسط السرعة.',
};

/**
 * The spoken line for one alert event. Cameras resolve through the tokens
 * dictionaries (cam_500 … cam_passing); zone keys through the maps above.
 */
export function mapAlertCopy(ev: AlertEvent, dialect: Dialect): string {
  if (ev.pointType === 'zone') {
    const zoneMap = dialect === 'msa' ? ZONE_MSA : ZONE_JO;
    return zoneMap[ev.key] ?? '';
  }
  const dict = dialect === 'msa' ? voice.msa : voice.jordanian;
  const direct = dict[ev.key];
  if (direct) return direct;
  // dictionary gap (e.g. cam_150 missing in MSA) → descriptive Fallback line
  const label = TYPE_LABEL_AR[ev.pointType] ?? 'تنبيه';
  const dist = Math.round(ev.distM);
  const limitTxt = ev.limitKph != null ? ` الحد ${ev.limitKph}` : '';
  return `${label} على بعد ${dist} متر.${limitTxt}`;
}

/** Short on-card headline, dialect-free (dialect is the spoken line's job). */
export function alertHeadline(ev: AlertEvent): string {
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
  const label = TYPE_LABEL_AR[ev.pointType] ?? 'تنبيه';
  return `${label} — بعد ${Math.round(ev.distM)}م`;
}

/** Haptic escalation per event class (expo-haptics, guarded by caller). */
export type ImpactClass = 'success' | 'warning' | 'error';

export function impactClassFor(ev: AlertEvent): ImpactClass {
  if (ev.key === 'zone_exit_bad') return 'error';
  if (ev.key === 'zone_exit_ok') return 'success';
  return 'warning';
}
