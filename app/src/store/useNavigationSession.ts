import { create } from 'zustand';
import type { PlaceHit, RouteOption } from '../api/routing/types';

/**
 * Navigation session — in-memory ONLY, deliberately never persisted
 * (privacy-first: where you drove is nobody's business but yours; a cold app
 * start means a fresh idle session, which is the honest state anyway).
 */
export type NavigationPhase = 'idle' | 'routing' | 'navigating';

export interface NavigationSessionState {
  phase: NavigationPhase;
  /** The route currently being driven / previewed as top option. */
  activeRoute: RouteOption | null;
  /** Remaining provider options besides activeRoute (may be empty). */
  alternatives: RouteOption[];
  destination: PlaceHit | null;
  /** How many reroute attempts this session took (deviation re-plans). */
  rerouteCount: number;
  setPhase: (phase: NavigationPhase) => void;
  setDestination: (destination: PlaceHit | null) => void;
  setActiveRoute: (route: RouteOption | null, alternatives?: RouteOption[]) => void;
  /** Atomic handoff into the turn-by-turn screen. */
  startNavigation: (route: RouteOption, alternatives: RouteOption[], destination: PlaceHit) => void;
  incrementReroute: () => void;
  reset: () => void;
}

const IDLE = {
  phase: 'idle' as NavigationPhase,
  activeRoute: null,
  alternatives: [],
  destination: null,
  rerouteCount: 0,
};

export const useNavigationSession = create<NavigationSessionState>()((set) => ({
  ...IDLE,
  setPhase: (phase) => set({ phase }),
  setDestination: (destination) => set({ destination }),
  setActiveRoute: (activeRoute, alternatives) =>
    set((s) => ({ activeRoute, alternatives: alternatives ?? s.alternatives })),
  startNavigation: (activeRoute, alternatives, destination) =>
    set({ phase: 'navigating', activeRoute, alternatives, destination, rerouteCount: 0 }),
  incrementReroute: () => set((s) => ({ rerouteCount: s.rerouteCount + 1 })),
  reset: () => set({ ...IDLE }),
}));
