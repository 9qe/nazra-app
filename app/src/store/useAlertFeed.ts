import { create } from 'zustand';
import type { AlertEvent } from '../engine/AlertEngine';

const MAX_EVENTS = 60;

export interface AlertFeedState {
  /** Newest first, capped at MAX_EVENTS. */
  events: AlertEvent[];
  /** Event currently shown in the map overlay card; null after ack. */
  current: AlertEvent | null;
  push: (ev: AlertEvent) => void;
  clearCurrent: () => void;
  clearAll: () => void;
}

export const useAlertFeed = create<AlertFeedState>()((set) => ({
  events: [],
  current: null,
  push: (ev) => set((s) => ({ events: [ev, ...s.events].slice(0, MAX_EVENTS), current: ev })),
  clearCurrent: () => set({ current: null }),
  clearAll: () => set({ events: [], current: null }),
}));
