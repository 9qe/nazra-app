import * as ES from 'expo-status-bar';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { AppShell } from './src/components/AppShell';
import { useDesignSystem } from './src/theme/ThemeProvider';
import { useAppStatus } from './src/store/useAppStatus';

/**
 * Web-preview shell + native root in one file:
 *  - native (iOS/Android): AppShell mounts the real navigator.
 *  - web: a static, scrollable previewer shell — exported via
 *    `npx expo export --platform web` as the static site build.
 */
export default function App() {
  if (isNativeRuntime()) {
    return <AppShell />;
  }
  return <WebPreviewShell />;
}

/** Native runs without a DOM; browser shell takes over on web. */
function isNativeRuntime(): boolean {
  return typeof document === 'undefined';
}

function WebPreviewShell() {
  const t = useDesignSystem();
  const { width } = useWindowDimensions();
  const onboarded = useAppStatus((st) => st.onboarded);

  return (
    <View style={[css.root, { maxWidth: width }]}>
      <ES.StatusBar style="light" />
      <View style={css.header}>
        <Text style={[t.text.display, { color: t.colors.textPrimary }]}>radarbot clone — scaffold preview</Text>
        <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
          web exporter shell · native build mounts AppShell directly
        </Text>
      </View>
      <ScrollView contentContainerStyle={css.body}>
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
          Onboarding gate: {onboarded ? 'open' : 'pending'} · routes: HomeMap, Alerts, Report, RadarList, Settings
        </Text>
        <WebPreviewButton label="Open HomeMap placeholder" />
        <WebPreviewButton label="Open RadarList placeholder" />
        <WebPreviewButton label="Open Settings placeholder" />
        <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
          Screen flows are stubbed; fill tokens.ts before shipping branded previews.
        </Text>
      </ScrollView>
    </View>
  );
}

function WebPreviewButton({ label }: { label: string }) {
  const t = useDesignSystem();
  return (
    <Pressable>
      <Text style={[t.text.label, { color: t.colors.textSecondary, paddingVertical: 6 }]}>{label}</Text>
    </Pressable>
  );
}

const css = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E1116' },
  header: { paddingTop: 48, paddingHorizontal: 16, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2c3440' },
  body: { padding: 16, gap: 8 },
});
