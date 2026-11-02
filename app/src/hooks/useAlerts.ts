import { useEffect, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { AlertEngine, type AlertEngineOptions, type AlertEvent, type AlertPoint, type AlertZone } from '../engine/AlertEngine';
import { ALERT_POINTS, ALERT_ZONES } from '../data/radarDataset';
import { impactClassFor, mapAlertCopy, SPEECH_LANG_JORDANIAN, SPEECH_LANG_MSA, SPEECH_RATE, type Dialect } from '../engine/voice';
import { useAlertFeed } from '../store/useAlertFeed';
import { useNazraSettings } from '../store/useSettings';
import type { Fix } from './useLocationStream';

/**
 * Wires the pure AlertEngine to the platform layer:
 * fix → engine → feed store + expo-speech (ar-JO, 1.05) + expo-haptics.
 * Speech/haptics read the latest settings off a ref so mid-drive toggles
 * apply on the very next event without rebuilding engine state.
 */
export function useAlerts(fix: Fix | null): void {
  const settings = useNazraSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const feedPush = useAlertFeed((s) => s.push);

  const onEmit = useRef((ev: AlertEvent) => {
    useAlertFeed.getState().push(ev);
    const s = settingsRef.current;
    if (s.vibe) {
      void fireHaptic(ev);
    }
    if (s.voiceOn) {
      const dialect: Dialect = s.msa ? 'msa' : 'jordanian';
      speakAlert(ev, dialect);
    }
  }).current;

  const engine = useRef<AlertEngine | null>(null);
  if (!engine.current) {
    engine.current = new AlertEngine(
      ALERT_POINTS,
      ALERT_ZONES,
      engineOptsFrom(settings),
      onEmit,
    );
  }

  // settings → engine, live (rings, threshold) without discarding re-arm state
  useEffect(() => {
    engine.current?.setOptions(engineOptsFrom(settings));
  }, [settings]);

  useEffect(() => {
    if (!fix) {
      engine.current?.reset();
      return;
    }
    engine.current?.onPos(fix.lat, fix.lng, fix.speedKph, Date.now());
  }, [fix]);
}

function engineOptsFrom(s: ReturnType<typeof useNazraSettings.getState>): AlertEngineOptions {
  const pre = Math.max(100, Math.min(2000, s.preDistM));
  return {
    // ring ladder scales off preDist; key names stay cam_500/300/150 (PWA contract)
    camRadiiM: [pre, Math.round(pre * 0.6), Math.round(pre * 0.3)],
    passingRadiusM: Math.max(40, Math.round(pre * 0.12)),
    // corridor gates — PWA spec: enter 180 m, exit 220 m (preview/app.js)
    zoneEnterRadiusM: 180,
    zoneExitRadiusM: 220,
    rearmMs: 45_000,
    minIntervalMs: 900,
    threshold: { mode: s.thresholdMode, absKph: s.thresholdAbsKph, pct: s.thresholdPct },
  };
}

function speakAlert(ev: AlertEvent, dialect: Dialect): void {
  const text = mapAlertCopy(ev, dialect);
  if (!text) return;
  try {
    Speech.stop();
    Speech.speak(text, {
      language: dialect === 'msa' ? SPEECH_LANG_MSA : SPEECH_LANG_JORDANIAN,
      rate: SPEECH_RATE,
      pitch: 1.0,
    });
  } catch {
    // no TTS engine / simulator quirk — visuals still fire
  }
}

async function fireHaptic(ev: AlertEvent): Promise<void> {
  try {
    const cls = impactClassFor(ev);
    if (cls === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (cls === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // unsupported device — skip
  }
}
