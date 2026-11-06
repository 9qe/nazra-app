import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, I18nManager } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { CAMERA_POINTS, ZONE_POINTS, TYPE_COLOR, TYPE_LABEL_AR, pointName, CAMERA_COUNT, ZONE_COUNT } from '../../data/radarDataset';
import { DEFAULT_CENTER } from '../../api/query';
import { distanceKm } from '../../utils/geo';
import { useAlerts } from '../../hooks/useAlerts';
import { useLocationStream } from '../../hooks/useLocationStream';
import { openSystemSettings } from '../../security/permissionGate';
import { useAlertFeed } from '../../store/useAlertFeed';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { AlertDialogCard } from '../AlertDialog/AlertDialogScreen';
import type { RootStackParamList } from '../../navigation/types';

/**
 * Real Apple-Maps screen (MapKit via react-native-maps, no keys needed):
 * corpus pins colored per type, avg-corridor polylines, user dot, follow-cam,
 * live speed HUD from the expo-location stream, alert card overlay fed by
 * useAlerts (engine + speech + haptics). Permission-denied renders an
 * instructive banner over the map — never a crash, never a fake map.
 */
export function HomeMapScreen() {
  const t = useTheme();
  const s = useHomeStyles();
  const insets = useSafeAreaInsets();
  // root-stack navigation for the search entry affordance
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const { permission, fix, error, request } = useLocationStream();
  useAlerts(fix);
  const current = useAlertFeed((st) => st.current);
  const clearCurrent = useAlertFeed((st) => st.clearCurrent);

  const [follow, setFollow] = useState(true);
  const mapRef = useRef<MapView | null>(null);

  const initialRegion: Region = useMemo(
    () => ({
      latitude: fix?.lat ?? DEFAULT_CENTER.lat,
      longitude: fix?.lng ?? DEFAULT_CENTER.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    // re-center only when a fix first arrives — after that, follow-cam handles it
    [fix?.lat == null, fix?.lng == null],
  );

  // follow-cam: gentle recenter every ~1.5 s of movement while toggled
  const followKey = fix != null && follow ? Math.floor(fix.timestamp / 1500) : -1;
  useEffect(() => {
    if (followKey < 0 || !fix || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: fix.lat, longitude: fix.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      600,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey]);

  // nearest enforced camera for the HUD limit chip
  const nearest = useMemo(() => {
    if (!fix) return null;
    let best: { id: string; distM: number; limit: number | null; type: keyof typeof TYPE_COLOR; name: string } | null = null;
    for (const p of CAMERA_POINTS) {
      const d = distanceKm({ lat: fix.lat, lng: fix.lng }, p) * 1000;
      if (!best || d < best.distM) best = { id: p.id, distM: d, limit: p.limit, type: p.type, name: pointName(p) };
    }
    return best;
  }, [fix]);

  const granted = permission === 'granted';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* destination search entry — added affordance; map/alert layout untouched */}
      <View style={[s.searchEntryRow, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' as const }]}>
        <Pressable
          style={({ pressed }) => [s.searchEntryBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('Search')}
          hitSlop={6}
        >
          <Text style={[t.text.label, { color: t.colors.textPrimary }]}>🔍 بحث وجهة</Text>
        </Pressable>
      </View>
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation={granted}
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={false}
          userInterfaceStyle="dark"
          onPress={() => undefined}
        >
          {CAMERA_POINTS.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              title={pointName(p)}
              description={`${TYPE_LABEL_AR[p.type]} · الحد ${p.limit ?? '—'} · ${p.verified ? 'موثّقة' : 'مصدر عام'}`}
              pinColor={TYPE_COLOR[p.type]}
              anchor={{ x: 0.5, y: 1 }}
            />
          ))}
          {ZONE_POINTS.map((z) => (
            <Polyline
              key={z.id}
              coordinates={[
                { latitude: z.enter[0], longitude: z.enter[1] },
                { latitude: z.exit[0], longitude: z.exit[1] },
              ]}
              strokeColor={TYPE_COLOR.avg}
              strokeWidth={4}
              lineDashPattern={[6, 4]}
            />
          ))}
          {ZONE_POINTS.map((z) => (
            <Marker
              key={`${z.id}#gate`}
              coordinate={{ latitude: z.enter[0], longitude: z.enter[1] }}
              title={pointName(z)}
              description={`مقطع متوسط · ${z.lenM} م · الحد ${z.limit ?? '—'}`}
              pinColor={TYPE_COLOR.avg}
            />
          ))}
        </MapView>

        {/* top-right follow toggle */}
        <View style={[s.followBtn, { top: insets.top + 8 }]}>
          <Pressable onPress={() => setFollow((f) => !f)} hitSlop={6}>
            <Text style={[t.text.label, { color: follow ? t.colors.accent : t.colors.textSecondary }]}>
              {follow ? '◎ اتبعني' : '○ اتبعني'}
            </Text>
          </Pressable>
        </View>

        {/* permission-instructive banner — instructive, not a crash */}
        {!granted && (
          <View style={[s.permBanner, { top: insets.top + 8 }]}>
            <Text style={[t.text.label, { color: t.colors.textPrimary }]}>
              {permission === 'denied'
                ? 'الإذن مقفول — الخريطة شغالة، بس التنبيهات محتاجة الموقع.'
                : error
                  ? 'مشكلة بالموقع — جرّب تطلب الإذن مرة ثانية.'
                  : 'فعّل الموقع لتنبيهات حقيقية على الطريق.'}
            </Text>
            <View style={s.permActions}>
              <Pressable style={({ pressed }) => [s.permBtn, pressed && { opacity: 0.85 }]} onPress={() => void request()}>
                <Text style={[t.text.label, { color: '#FFFFFF' }]}>طلب الإذن</Text>
              </Pressable>
              {permission === 'denied' && (
                <Pressable style={({ pressed }) => [s.permBtnGhost, pressed && { opacity: 0.8 }]} onPress={openSystemSettings}>
                  <Text style={[t.text.label, { color: t.colors.accent }]}>إعدادات النظام</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* speed HUD */}
        <View style={s.hud}>
          <View style={s.hudCell}>
            <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>السرعة</Text>
            <Text style={s.hudSpeed}>{fix?.speedKph != null ? fix.speedKph.toFixed(0) : '—'}</Text>
            <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>كم/س</Text>
          </View>
          <View style={s.hudCell}>
            <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>أقرب كاميرا</Text>
            <Text style={s.hudSpeed}>{nearest ? `${Math.round(nearest.distM)}م` : '—'}</Text>
            <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>
              {nearest ? `${TYPE_LABEL_AR[nearest.type]}${nearest.limit != null ? ` · الحد ${nearest.limit}` : ''}` : 'بلا إذن'}
            </Text>
          </View>
          <View style={s.hudCell}>
            <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>النقاط</Text>
            <Text style={s.hudSpeed}>{`${CAMERA_COUNT + ZONE_COUNT}`}</Text>
            <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>مضمّنة من الحزمة</Text>
          </View>
        </View>

        {/* live alert overlay */}
        {current && (
          <View style={s.alertSlot}>
            <AlertDialogCard ev={current} onDismiss={clearCurrent} />
          </View>
        )}
      </View>
    </View>
  );
}

/** run a callback at most once per key change (throttle primitive for follow-cam) */
const useHomeStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    mapWrap: { flex: 1, overflow: 'hidden' },
    searchEntryRow: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 },
    searchEntryBtn: {
      alignSelf: 'flex-start',
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    followBtn: {
      position: 'absolute',
      right: 12,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    permBanner: {
      position: 'absolute',
      left: 12,
      right: 12,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: 12,
      gap: 8,
    },
    permActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    permBtn: { backgroundColor: t.colors.accent, borderRadius: t.radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
    permBtnGhost: { borderRadius: t.radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
    hud: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      backgroundColor: t.colors.scrim,
      borderRadius: t.radius.lg,
      paddingVertical: 10,
    },
    hudCell: { flex: 1, alignItems: 'center', gap: 1 },
    hudSpeed: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: t.colors.textPrimary },
    alertSlot: {
      position: 'absolute',
      bottom: 84,
      left: 12,
      right: 12,
    },
  }),
);

// NOTE: MapView typing quirk on RN 0.88 + maps 1.29: invalidateFrame is optional
// and guarded; Apple-Maps provider needs no key, Google provider stays unconfigured.
