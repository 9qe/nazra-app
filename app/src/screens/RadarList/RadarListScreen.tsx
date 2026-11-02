import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CAMERA_COUNT,
  CAMERA_POINTS,
  DATASET_META,
  TYPE_COLOR,
  TYPE_FILTERS,
  TYPE_LABEL_AR,
  ZONE_COUNT,
  ZONE_POINTS,
  pointName,
  searchTextOf,
  type TypeFilter,
} from '../../data/radarDataset';
import { getOneFix, type Fix } from '../../hooks/useLocationStream';
import { distanceKm } from '../../utils/geo';
import type { CameraType, MapPoint, ZonePoint } from '../../types/radar';
import { useTheme, makeStyles } from '../../theme/useTheme';

type Row = MapPoint | ZonePoint;

/**
 * Real list over the bundled corpus (177 cameras + 9 avg corridors) with live
 * search (ar/en names, operator, source, type) and Arabic type chips from the
 * PWA's filter row. Distance sorts/labels activate when the user has granted
 * a foreground fix; without it the list stays complete, just unranked.
 */
export function RadarListScreen() {
  const t = useTheme();
  const s = useListStyles();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [fix, setFix] = useState<Fix | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOneFix().then((f) => {
      if (!cancelled) setFix(f);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: Array<Row & { distKm?: number }> = useMemo(() => {
    const src: Row[] = [...CAMERA_POINTS, ...ZONE_POINTS];
    let out: Row[] = src;
    if (filter !== 'all') out = out.filter((p) => p.type === filter);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((p) => searchTextOf(p).includes(q));
    const annotated: Array<Row & { distKm?: number }> = fix
      ? out.map((p) => ({ ...p, distKm: distanceKm({ lat: fix.lat, lng: fix.lng }, p) }))
      : out.map((p) => ({ ...p }));
    if (fix) annotated.sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0));
    return annotated;
  }, [query, filter, fix]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headRow}>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>كل الكاميرات</Text>
        <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
          {`${CAMERA_COUNT} كاميرا · ${ZONE_COUNT} مقاطع متوسط`}
        </Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="ابحث… شارع، منطقة، نوع"
        placeholderTextColor={t.colors.textDisabled}
        style={[s.search, { color: t.colors.textPrimary, borderColor: t.colors.border }]}
      />
      <View style={s.chips}>
        {TYPE_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[s.chip, filter === f.key && { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]}
          >
            <Text style={[t.text.label, { color: t.colors.textPrimary }]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[t.text.micro, { color: t.colors.textDisabled }]} numberOfLines={1}>
        {`مصادر: ${DATASET_META.sources.join(' · ')} · توليد ${DATASET_META.generated}`}
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        renderItem={({ item }) => <RowCard row={item} />}
      />
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

function RowCard({ row }: { row: Row & { distKm?: number } }) {
  const t = useTheme();
  const s = useListStyles();
  const typeLabel = row.type === 'avg' ? 'مقطع متوسط السرعة' : TYPE_LABEL_AR[row.type as CameraType];
  const name = pointName(row);
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: TYPE_COLOR[row.type as CameraType] }]} />
      <View style={[s.col, s.grow]}>
        <Text style={[t.text.title, { color: t.colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[t.text.label, { color: t.colors.textSecondary }]} numberOfLines={1}>
          {`الحد: ${row.limit ?? '—'} · ${row.operator} · ${typeLabel}`}
        </Text>
        <Text style={[t.text.micro, { color: t.colors.textDisabled }]} numberOfLines={1}>
          {`${row.source}${row.verified ? ' · ✔ موثّقة' : ''}${row.type === 'avg' ? '' : ` · ثقة ${Math.round((row.confidence ?? 0) * 100)}%`} · أُضيفت ${row.added}`}
        </Text>
      </View>
      {row.distKm != null && (
        <Text style={[t.text.label, { color: t.colors.accent }]}>{`${row.distKm.toFixed(1)} كم`}</Text>
      )}
    </View>
  );
}

const useListStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing[3], gap: t.spacing[2] },
    headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    search: { borderWidth: 1, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '500' as const },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border },
    row: { flexDirection: 'row', gap: 10, paddingVertical: 10, alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: t.radius.pill, marginTop: 2 },
    col: { gap: 2 },
    grow: { flex: 1 },
  }),
);
