import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { asyncStorageAdapter } from './storage';

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
      name: 'app-status-v1', // storage key — bump on store shape change
      storage: createJSONStorage(() => asyncStorageAdapter),
    },
  ),
);
