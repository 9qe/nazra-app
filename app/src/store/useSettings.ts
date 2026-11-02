import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { asyncStorageAdapter } from './storage';

export type ThresholdMode = 'abs' | 'pct';

export interface NazraSettingsState {
  /** First camera ring — scales the whole ring ladder; 500 ⇒ [500, 300, 150]. */
  preDistM: number;
  thresholdMode: ThresholdMode;
  /** grace over the limit when thresholdMode === 'abs', km/h. */
  thresholdAbsKph: number;
  /** grace over the limit when thresholdMode === 'pct', percent. */
  thresholdPct: number;
  /** spoken alerts on/off (expo-speech, ar-JO, rate 1.05). */
  voiceOn: boolean;
  /** MSA wording instead of Zeizo's Jordanian. */
  msa: boolean;
  /** haptic feedback (expo-haptics). */
  vibe: boolean;
  /**
   * Background ('always') alerts are OFF by default and cannot be enabled
   * here: iOS needs a native UIBackgroundModes/location config that ships in
   * a later build. Kept as a locked toggle so the UI is honest about it.
   */
  bgAlertsOff: boolean;
  set: (patch: Partial<Omit<NazraSettingsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

export const DEFAULT_SETTINGS = {
  preDistM: 500,
  thresholdMode: 'abs' as ThresholdMode,
  thresholdAbsKph: 10,
  thresholdPct: 15,
  voiceOn: true,
  msa: false,
  vibe: true,
  bgAlertsOff: true,
} as const;

export const useNazraSettings = create<NazraSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'nazra-settings-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
    },
  ),
);
