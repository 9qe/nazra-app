export type RootStackParamList = {
  Onboarding: undefined;
  Paywall: undefined;
  /** Tab shell registered at top level for conditional screens. */
  Tabs: undefined;
};

export type AppTabParamList = {
  HomeMap: undefined;
  Alerts: { focusRadarId?: string } | undefined;
  Report: undefined;
  RadarList: undefined;
  Settings: undefined;
};
