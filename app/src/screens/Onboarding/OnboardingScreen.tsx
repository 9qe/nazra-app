import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { useAppStatus } from '../../store/useAppStatus';

/** TODO(name-brand): replace placeholder copy with brand onboarding flow copy. */
export function OnboardingScreen() {
  const t = useTheme();
  const s = useOnboardingStyles();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAppStatus((st) => st.completeOnboarding);

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={[t.text.display, { color: t.colors.textPrimary }]}>
          {/* TODO(name-brand): headline */}
          Jordan traffic alerts, offline
        </Text>
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
          {/* TODO(name-brand): subheading copy */}
          Speed cameras, checkpoints, and community reports on every corridor — cached before you leave the house.
        </Text>
        {['', '', ''].map((h, i) => (
          <View key={i} style={s.featureRow}>
            <View style={s.featureDot} />
            <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
              {/* TODO(name-brand): feature bullets (3) */}
              Placeholder feature {i + 1}
            </Text>
          </View>
        ))}
      </ScrollView>
      <Pressable style={({ pressed }) => [s.cta, pressed && { opacity: 0.8 }]} onPress={completeOnboarding}>
        {/* TODO(name-brand): CTA label + brand primary color binding */}
        <Text style={[t.text.title, { color: t.colors.textPrimary }]}>Get started</Text>
      </Pressable>
    </View>
  );
}

const useOnboardingStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    body: { flexGrow: 1, justifyContent: 'center', padding: t.spacing[5], gap: t.spacing[4] },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    featureDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: t.colors.accent },
    cta: {
      marginHorizontal: t.spacing[4],
      marginBottom: t.spacing[3],
      paddingVertical: t.spacing[4],
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.primary,
      alignItems: 'center',
    },
  }),
);
