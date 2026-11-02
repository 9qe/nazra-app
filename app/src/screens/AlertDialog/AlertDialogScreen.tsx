import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPE_COLOR, TYPE_LABEL_AR } from '../../data/radarDataset';
import { alertHeadline, impactClassFor, mapAlertCopy } from '../../engine/voice';
import type { AlertEvent } from '../../engine/AlertEngine';
import { useNazraSettings } from '../../store/useSettings';
import { useAlertFeed } from '../../store/useAlertFeed';
import { useTheme, makeStyles, type ThemeValue } from '../../theme/useTheme';

/**
 * AlertDialog — the live alert card (mounted as HomeMap overlay) plus the
 * alert-history tab. Card visual class follows impactClassFor: warning amber,
 * success pine, error deep rose.
 */

export function AlertDialogCard({ ev, onDismiss }: { ev: AlertEvent; onDismiss?: () => void }) {
  const t = useTheme();
  const s = useCardStyles();
  const msa = useNazraSettings((st) => st.msa);
  const barColor = ev.pointType === 'zone' ? t.colors.accent : TYPE_COLOR[ev.pointType];
  const cls = impactClassFor(ev);
  const copy = mapAlertCopy(ev, msa ? 'msa' : 'jordanian');
  const tension = cls === 'error' ? t.colors.critical : cls === 'success' ? t.colors.success : t.colors.warn;

  return (
    <View style={[s.card, { borderStartColor: barColor }]}>
      <View style={s.rule}>
        <Text style={[s.overline, { color: tension }]}>
          {cls === 'error' ? 'فوق الحد' : cls === 'success' ? 'نظيف' : 'خلّ بالك'}
        </Text>
        <Text style={[t.text.headline, { color: t.colors.textPrimary, fontSize: 20, lineHeight: 26 }]}>
          {alertHeadline(ev)}
        </Text>
      </View>
      <Text style={[t.text.body, { color: t.colors.textSecondary }]}>{copy}</Text>
      <MetaRow ev={ev} />
      {ev.pointType === 'zone' && ev.avgSpeedKph != null && (
        <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>
          {`المتوسط ${ev.avgSpeedKph.toFixed(0)} كم/س · الحد ${ev.limitKph ?? '—'} · المقطع ${((ev.segmentLenM ?? 0) / 1000).toFixed(1)} كم`}
        </Text>
      )}
      <MetaPlusName ev={ev} />
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [s.dismiss, pressed && { opacity: 0.8 }]}
          hitSlop={8}
        >
          <Text style={[t.text.label, { color: t.colors.textSecondary }]}>تمام</Text>
        </Pressable>
      )}
    </View>
  );
}

function MetaRow({ ev }: { ev: AlertEvent }) {
  const t = useTheme();
  const limitTxt = ev.limitKph != null ? `${ev.limitKph} كم/س` : '—';
  const speedTxt = ev.speedKph != null ? `${ev.speedKph.toFixed(0)} كم/س` : '—';
  const overBadge =
    ev.over === true ? { text: 'فوق', color: t.colors.critical }
    : ev.over === false ? { text: 'بالحد', color: t.colors.success }
    : { text: 'بلا قياس', color: t.colors.textDisabled };
  return (
    <View style={styles.metaRow}>
      <Badge text={`الحد ${limitTxt}`} base={t} />
      <Badge text={`السرعة ${speedTxt}`} base={t} />
      <Badge text={overBadge.text} color={overBadge.color} base={t} />
    </View>
  );
}

function MetaPlusName({ ev }: { ev: AlertEvent }) {
  const t = useTheme();
  const label = ev.pointType === 'zone' ? 'مقطع متوسط' : (TYPE_LABEL_AR[ev.pointType] ?? 'نقطة');
  const name = ev.nameAr || ev.nameEn;
  return (
    <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
      {`${label}${name ? ` · ${name}` : ''} · ${ev.pointId}`}
    </Text>
  );
}

function Badge({ text, color, base }: { text: string; color?: string; base: ThemeValue }) {
  return (
    <View style={[styles.badge, { borderColor: color ?? base.colors.border }]}>
      <Text style={[base.text.micro, { color: color ?? base.colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

/** Alerts tab: current card on top + session history. */
export function AlertDialogScreen() {
  const t = useTheme();
  const s = useListStyles();
  const insets = useSafeAreaInsets();
  const events = useAlertFeed((st) => st.events);
  const clearAll = useAlertFeed((st) => st.clearAll);
  const clearCurrent = useAlertFeed((st) => st.clearCurrent);
  const current = useAlertFeed((st) => st.current);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>تنبيهات الجلسة</Text>
        {events.length > 0 && (
          <Pressable onPress={clearAll} hitSlop={6}>
            <Text style={[t.text.label, { color: t.colors.primary }]}>تفريغ</Text>
          </Pressable>
        )}
      </View>
      {current && <AlertDialogCard ev={current} onDismiss={clearCurrent} />}
      {events.length === 0 ? (
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
          ما في تنبيهات بعد — حرّك على مسار فيه كاميرات ومقاطع، والقائمة هنّ بتعبّي لحالها.
        </Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(ev) => ev.uid}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={[s.dot, { backgroundColor: item.pointType === 'zone' ? t.colors.accent : TYPE_COLOR[item.pointType] }]} />
              <View style={[styles.grow, styles.rowBody]}>
                <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{alertHeadline(item)}</Text>
                <Text style={[t.text.micro, { color: t.colors.textSecondary }]}numberOfLines={1}>
                  {`${item.pointId} · ${new Date(item.atMs).toLocaleTimeString()}`}
                </Text>
              </View>
              {item.over === true && <Text style={[t.text.micro, { color: t.colors.critical }]}>فوق</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  grow: { flex: 1 },
  rowBody: { gap: 2 },
});

const useCardStyles = makeStyles((t) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface,
      borderStartWidth: 4,
      borderRadius: t.radius.lg,
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    rule: { gap: 2 },
    overline: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    dismiss: { alignSelf: 'flex-start', marginTop: 2 },
  }),
);

const useListStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing[4], gap: t.spacing[3] },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    dot: { width: 10, height: 10, borderRadius: 999 },
  }),
);
