import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { AppTabParamList } from '../../navigation/types';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { useAllRadars } from '../../api/query';

/** AlertDialog = current alert stack top card + "acknowledge" quick action. */
export function AlertDialogScreen() {
  const t = useTheme();
  const s = useAlertDialogStyles();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<AppTabParamList, 'Alerts'>>();
  const { data: radars = [] } = useAllRadars();
  const focused = radars.find((r) => r.id === route.params?.focusRadarId) ?? radars[0];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>Alerts</Text>
      {focused ? (
        <View style={s.card}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{focused.name}</Text>
          <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
            {focused.kind} camera · {focused.speedLimitKph} km/h · {focused.governate}
          </Text>
          {/* TODO(name-brand): alert severity wording + color mapping from brand kit. */}
          <Pressable style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]}>
            <Text style={[t.text.label, { color: t.colors.textPrimary }]}>Acknowledge</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
          No alert payload. Open from the radar list or wait for a fix.
        </Text>
      )}
    </View>
  );
}

const useAlertDialogStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing[4], gap: t.spacing[3] },
    card: {
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: 16,
      gap: 8,
    },
    button: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: t.radius.pill, backgroundColor: t.colors.primary },
  }),
);
