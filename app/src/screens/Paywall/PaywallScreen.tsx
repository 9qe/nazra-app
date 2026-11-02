import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme, makeStyles } from '../../theme/useTheme';

export function PaywallScreen(_props: NativeStackScreenProps<RootStackParamList, 'Paywall'>) {
  const t = useTheme();
  const s = usePaywallStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>Pro tier</Text>
        {/* TODO(name-brand): paywall benefit list + price points are brand copy. */}
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
          Placeholder benefits: corridor alerts before ramps, penalty-point forecasting, no-brand watermarks.
        </Text>
        {['Basic', 'Pro', 'Family'].map((tier, i) => (
          <View key={tier} style={s.tier}>
            <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{tier}</Text>
            <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
             TODO(name-brand): price & features for tier {i + 1}
            </Text>
          </View>
        ))}
        <Pressable style={({ pressed }) => [s.buy, pressed && { opacity: 0.85 }]}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>Continue</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const usePaywallStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    body: { padding: t.spacing[4], gap: t.spacing[3] },
    tier: { borderRadius: t.radius.lg, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, padding: 16, gap: 4 },
    buy: { marginTop: t.spacing[2], padding: 16, borderRadius: t.radius.lg, backgroundColor: t.colors.accent, alignItems: 'center' },
  }),
);
