import { useEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigationProp } from '@react-navigation/native';
import type { RouteLegManeuver } from '../../api/routing/types';
import { DEFAULT_CENTER } from '../../api/query';
import { useAlerts } from '../../hooks/useAlerts';
import { useLocationStream } from '../../hooks/useLocationStream';
import type { RootStackParamList } from '../../navigation/types';
import { useAlertFeed } from '../../store/useAlertFeed';
import { useNavigationSession } from '../../store/useNavigationSession';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { AlertDialogCard } from '../AlertDialog/AlertDialogScreen';
import { progressFraction, projectOnRoute } from './routeProgress';

/**
 * Turn-by-turn over the session's active route, composed the same way as
 * HomeMapScreen (MapView + overlays + useAlerts instance + alert card slot).
 * Progress/next-maneuver come from pure route projection; deviation beyond
 * 60 m for 3 consecutive fixes triggers a throttled re-route through the
 * routing service seam. Drive-end flips an explicit reached card.
 */

const DEVIATION_LIMIT_M = 60;
const DEVIATION_STREAK = 3;
const REROUTE_THROTTLE_MS = 20_000;
const NEXT_MANEUVER_AHEAD_M = 40;
const REACHED_FRACTION = 0.98;
const FOLLOW_STEP_MS = 1500;

export function NavigationScreen({ navigation }: { navigation: NavigationProp<RootStackParamList> }) {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();

  const { fix } = useLocationStream();
  useAlerts(fix); // own engine instance — camera alerts stay live while driving

  const activeRoute = useNavigationSession((st) => st.activeRoute);
  const destination = useNavigationSession((st) => st.destination);
  const rerouteCount = useNavigationSession((st) => st.rerouteCount);
  const setActiveRoute = useNavigationSession((st) => st.setActiveRoute);
  const incrementReroute = useNavigationSession((st) => st.incrementReroute);
  const reset = useNavigationSession((st) => st.reset);

  const current = useAlertFeed((st) => st.current);
  const clearCurrent = useAlertFeed((st) => st.clearCurrent);

  const [rerouting, setRerouting] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const offRouteStreak = useRef(0);
  const lastRerouteAt = useRef(0);

  // any exit (cancel, reached, swipe-back) leaves a clean idle session
  useEffect(
    () => () => {
      const st = useNavigationSession.getState();
      if (st.phase !== 'idle') st.reset();
    },
    [],
  );

  const progressInfo = useMemo(() => {
    if (!activeRoute || !fix) return null;
    const geometry = activeRoute.summary.geometry;
    const fraction = progressFraction({ lat: fix.lat, lng: fix.lng }, geometry, activeRoute.summary.distanceM);
    if (fraction === null) return null;
    const proj = projectOnRoute({ lat: fix.lat, lng: fix.lng }, geometry);
    if (proj === null) return null;
    // first maneuver >= 40 m ahead of the fix projection along the route
    let next: { maneuver: RouteLegManeuver; aheadM: number } | null = null;
    for (const m of activeRoute.summary.maneuvers) {
      const mproj = projectOnRoute({ lat: m.lngLatOfManeuver[1], lng: m.lngLatOfManeuver[0] }, geometry);
      if (mproj === null) continue;
      const aheadM = mproj.alongM - proj.alongM;
      if (aheadM >= NEXT_MANEUVER_AHEAD_M) {
        next = { maneuver: m, aheadM };
        break;
      }
    }
    return { fraction, offshoreM: proj.nearestM, next };
  }, [activeRoute, fix]);

  const reached = progressInfo != null && progressInfo.fraction >= REACHED_FRACTION;

  // deviation detection + throttled silent re-route
  useEffect(() => {
    if (!activeRoute || !destination || !fix || reached) return;
    const proj = projectOnRoute({ lat: fix.lat, lng: fix.lng }, activeRoute.summary.geometry);
    if (proj === null || proj.nearestM > DEVIATION_LIMIT_M) {
      offRouteStreak.current += 1;
    } else {
      offRouteStreak.current = 0;
    }
    if (offRouteStreak.current < DEVIATION_STREAK) return;
    const now = Date.now();
    if (now - lastRerouteAt.current < REROUTE_THROTTLE_MS) return;
    lastRerouteAt.current = now;
    incrementReroute();
    setRerouting(true);
    void (async () => {
      try {
        // routing service seam — lazy import inside the handler only
        const svc = await import('../../api/routing/service').then((m) => m.resolveRoutingProvider());
        const res = await svc.directions({
          origin: { lat: fix.lat, lng: fix.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          alternatives: true,
          language: 'ar',
        });
        if (res.ok && res.value.length > 0) {
          const topRoute = res.value[0] ?? null;
          if (topRoute) {
            setActiveRoute(topRoute, res.value.slice(1));
            offRouteStreak.current = 0;
          }
        }
        // on a typed failure or empty reply the current guidance stays — never fabricated
      } catch {
        // provider module unavailable mid-drive → current guidance remains
      } finally {
        setRerouting(false);
      }
    })();
  }, [fix, activeRoute, destination, reached, setActiveRoute, incrementReroute]);

  // follow-cam: gentle recenter every ~1.5 s of movement (same as HomeMap)
  const followKey = fix != null ? Math.floor(fix.timestamp / FOLLOW_STEP_MS) : -1;
  useEffect(() => {
    if (followKey < 0 || !fix || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: fix.lat, longitude: fix.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      600,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey]);

  const initialRegion: Region = useMemo(
    () => ({
      latitude: fix?.lat ?? destination?.lat ?? DEFAULT_CENTER.lat,
      longitude: fix?.lng ?? destination?.lng ?? DEFAULT_CENTER.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [fix?.lat == null, fix?.lng == null, destination?.lat, destination?.lng],
  );

  const onCancel = () => {
    reset();
    navigation.goBack();
  };

  if (!activeRoute || !destination) {
    // entered without a session (deep-link edge) — nothing fabricated, just out
    return (
      <View style={[s.container, s.center]}>
        <Text style={[t.text.title, { color: t.colors.textPrimary }]}>ما في مسار فعّال</Text>
        <Pressable style={[s.endBtn, { marginTop: t.spacing[4] }]} onPress={() => navigation.goBack()}>
          <Text style={[t.text.title, { color: '#FFFFFF' }]}>إغلاق</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={false}
          userInterfaceStyle="dark"
          onPress={() => undefined}
        >
          <Polyline
            coordinates={activeRoute.summary.geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))}
            strokeColor={t.colors.accent}
            strokeWidth={6}
          />
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title={destination.name}
            pinColor={t.colors.success}
            anchor={{ x: 0.5, y: 1 }}
          />
        </MapView>

        {/* guidance card: reroute chip, next maneuver, progress rail */}
        <View style={[s.guidance, { top: insets.top + 8 }]}>
          {rerouting && (
            <View style={s.rerouteChip}>
              <Text style={[t.text.micro, { color: '#FFFFFF' }]}>إعادة توجيه</Text>
            </View>
          )}
          {!rerouting && rerouteCount > 0 && (
            <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>إعادات توجيه: {rerouteCount}</Text>
          )}
          {progressInfo?.next && (
            <>
              <Text style={[t.text.title, { color: t.colors.textPrimary }]} numberOfLines={1}>
                {progressInfo.next.maneuver.instruction}
              </Text>
              <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
                {progressInfo.next.aheadM < 1000
                  ? `${Math.round(progressInfo.next.aheadM)}م`
                  : `${(progressInfo.next.aheadM / 1000).toFixed(1)}كم`}
              </Text>
            </>
          )}
          {!progressInfo?.next && reachableGuidance(progressInfo) && (
            <Text style={[t.text.body, { color: t.colors.textSecondary }]}>منتهية التعليمات — تابع للوجهة</Text>
          )}
          <View style={s.progressRail}>
            <View
              style={[
                s.progressFill,
                { width: `${Math.round((progressInfo?.fraction ?? 0) * 100)}%` },
              ]}
            />
          </View>
          <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>
            {Math.round((progressInfo?.fraction ?? 0) * 100)}% من المسار ·{' '}
            {(activeRoute.summary.distanceM / 1000).toFixed(1)} كم
          </Text>
        </View>

        {/* reached card — explicit end state, never auto-dismissed */}
        {reached && (
          <View style={s.reachedCard}>
            <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>تم الوصول 🎉</Text>
            <Pressable style={s.endBtn} onPress={onCancel}>
              <Text style={[t.text.title, { color: '#FFFFFF' }]}>إنهاء</Text>
            </Pressable>
          </View>
        )}

        {/* live alert overlay — same slot contract as HomeMap */}
        {current && (
          <View style={s.alertSlot}>
            <AlertDialogCard ev={current} onDismiss={clearCurrent} />
          </View>
        )}

        {/* big cancel — red-ish, always reachable, resets the session */}
        {!reached && (
          <View style={[s.cancelWrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
            <Pressable
              style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.85 }]}
              onPress={onCancel}
            >
              <Text style={[t.text.title, { color: '#FFFFFF' }]}>إغلاق</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

/** True only when a projection exists but the maneuver ladder ran dry. */
function reachableGuidance(
  info: { next: unknown } | null,
): boolean {
  return info != null && info.next == null;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    mapWrap: { flex: 1, overflow: 'hidden' },
    guidance: {
      position: 'absolute',
      left: 12,
      right: 12,
      backgroundColor: t.colors.scrim,
      borderRadius: t.radius.lg,
      padding: 12,
      gap: t.spacing[2],
    },
    rerouteChip: {
      alignSelf: I18nManager.isRTL ? 'flex-start' : 'flex-end',
      backgroundColor: t.colors.warn,
      borderRadius: t.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    progressRail: {
      height: 4,
      backgroundColor: t.colors.border,
      borderRadius: t.radius.pill,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      backgroundColor: t.colors.accent,
      borderRadius: t.radius.pill,
    },
    reachedCard: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 96,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: 16,
      gap: t.spacing[3],
      alignItems: 'center',
    },
    alertSlot: { position: 'absolute', bottom: 84, left: 12, right: 12 },
    cancelWrap: {
      position: 'absolute',
      left: 12,
      right: 12,
      alignItems: 'center',
    },
    cancelBtn: {
      backgroundColor: t.colors.critical,
      borderRadius: t.radius.pill,
      paddingVertical: 12,
      paddingHorizontal: 48,
    },
    endBtn: {
      backgroundColor: t.colors.accent,
      borderRadius: t.radius.pill,
      paddingVertical: 12,
      paddingHorizontal: 48,
    },
  }),
);
