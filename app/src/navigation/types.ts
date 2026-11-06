import type { PlaceHit } from '../api/routing/types';

export type RootStackParamList = {
  Onboarding: undefined;
  /** About modal — replaces the removed Paywall (no subscription exists). */
  About: undefined;
  /** Tab shell registered at top level for conditional screens. */
  Tabs: undefined;
  /** Destination search — pushed from the HomeMap top-bar entry. */
  Search: undefined;
  /** Route preview for a chosen destination; falls back to the session store when undefined. */
  RoutePreview: { destination: PlaceHit } | undefined;
  /** Turn-by-turn over the active route held in useNavigationSession. */
  Navigation: undefined;
};

export type AppTabParamList = {
  HomeMap: undefined;
  /** Corridor/camera alert history + live card. */
  Alerts: undefined;
  RadarList: undefined;
  Report: undefined;
  Settings: undefined;
};
