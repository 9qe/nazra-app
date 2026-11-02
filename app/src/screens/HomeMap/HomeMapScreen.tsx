import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { useLocationSeed } from '../../hooks/useLocationSeed';
import { useRadarsNear } from '../../api/query';
import { distanceKm } from '../../utils/geo';
import { STUB_CITY_CENTER } from '../../data/stubRadars';

export function HomeMapScreen() {
  const t = useTheme();
  const s = useHomeStyles();
  const insets = useSafeAreaInsets();
  const seed = useLocationSeed();
  const [routeName, setRouteName] = useState('top-radars');
  const q = useRadarsNear(seed?.lat ?? null, seed?.lng ?? null, 25);
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const center = seed ?? STUB_CITY_CENTER;
  const radars = q.data?.radars ?? [];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Map placeholder — real map engine (tiles/vector) lands with feature work. */}
      {/* TODO(feature-work): replace placeholder with map component + radar markers. */}
      <View style={s.mapSlot}>
        <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
          Map canvas slot — {routeName} route
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>Nearby radars</Text>
        {q.isPending && <Text style={[t.text.body, { color: t.colors.textSecondary }]}>Indexing stub data…</Text>}
        {q.isError && <Text style={[t.text.body, { color: t.colors.critical }]}>Proximity query failed: {String(q.error)}</Text>}
        {radars.map((r) => {
          const d = distanceKm(center, r);
          return (
            <View key={r.id} style={s.card}>
              <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{r.name}</Text>
              <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
                {r.kind} · limit {r.speedLimitKph} km/h · {d.toFixed(1)} km · conf {(r.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          );
        })}
        {!q.isPending && radars.length === 0 && !q.isError && (
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>No radars returned for this fix.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const useHomeStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    mapSlot: {
      height: '42%',
      minHeight: 220,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.mapOvernight,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: t.spacing[3],
    },
    listContent: { padding: t.spacing[4], gap: t.spacing[3] },
    card: {
      padding: 16,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      gap: 4,
    },
  }),
);
