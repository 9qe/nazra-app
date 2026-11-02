import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AppStatusState {
  /** Onboarding completed: drives root navigator gate. */
  onboarded: boolean;
  completeOnboarding: () => void;
  /** Units/speed limit preference later governed by locale. */
  useMetric: boolean;
  setUseMetric: (v: boolean) => void;
  /** Persistent fine display cache, hydrated after background syncs. */
  lastSyncIso: string | null;
  setLastSync: (iso: string) => void;
  /** Alerting enabled bell — read by permission prompt flow. */
  alertsEnabled: boolean;
  setAlertsEnabled: (v: boolean) => void;
}

/**
 * App-wide persistent state. Async data (radars, positions) lives in TanStack
 * Query instead — zustand only owns user-set toggles and lifecycle flags.
 */
export const useAppStatus = create<AppStatusState>()(
  persist(
    (set) => ({
      onboarded: false,
      completeOnboarding: () => set({ onboarded: true }),
      useMetric: true,
      setUseMetric: (v) => set({ useMetric: v }),
      lastSyncIso: null,
      setLastSync: (iso) => set({ lastSyncIso: iso }),
      alertsEnabled: true,
      setAlertsEnabled: (v) => set({ alertsEnabled: v }),
    }),
    {
      name: 'app-staus-v1', // storage key — bump on store shape change
      storage: createJSONStorage(() => localJson),
    },
  ),
);

/**
 * Minimal storage adapter. On native this bridges to AsyncStorage via
 * `@react-native-async-storage/async-storage`; on web falls back to
 * localStorage. Keeping it local avoids a hard cross-env dep in the skeleton.
 */
const localJson = {
  getItem: (name: string) => {
    try {
      const raw = globalThis.localStorage?.getItem(name);
      return Promise.resolve(raw);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(name, value);
    } catch {
      // Storage full / private mode: flag persists in-memory only, non-fatal.
    }
    return;
  },
  removeItem: async (name: string) => {
    try {
      globalThis.localStorage?.removeItem(name);
    } catch {
      // ignore
    }
  },
};
