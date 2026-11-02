import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { useAllRadars, useRadarsNear } from '../../api/query';
import type { Radar } from '../../types/radar';
import { STUB_CITY_CENTER } from '../../data/stubRadars';

export function RadarListScreen() {
  const t = useTheme();
  const s = useListStyles();
  const insets = useSafeAreaInsets();
  const all = useAllRadars();
  const near = useRadarsNear(STUB_CITY_CENTER.lat, STUB_CITY_CENTER.lng, 40);
  const confById = new Map((near.data?.radars ?? []).map((p) => [p.id, p.distanceKm]));

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>All radars</Text>
      <View style={s.filterRow}>
        <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
          {all.data?.length ?? 0} cameras · default filter: governorate + kind + proximity
        </Text>
        {/* TODO(feature-work): filter chips (kind, governate, active-only) */}
      </View>
      <ScrollView>
        <FlatList
          data={all.data ?? []}
          keyExtractor={(item: Radar) => item.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowHeadline}>
                <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{item.name}</Text>
                <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>{item.road}</Text>
              </View>
              <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
                {item.kind} · {item.speedLimitKph} km/h ·
                {confById.has(item.id) ? ` ${confById.get(item.id)!.toFixed(1)} km` : ' beyond stub radius'}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

const useListStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing[3], gap: t.spacing[2] },
    filterRow: { paddingBottom: t.spacing[1] },
    row: { paddingVertical: 10, gap: 2 },
    rowHeadline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border },
  }),
);
