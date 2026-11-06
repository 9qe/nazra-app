import { useEffect, useMemo, useState } from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigationProp } from '@react-navigation/native';
import type {
  PlaceHit,
  RouteOption,
  RoutingError,
  RoutingErrorCode,
} from '../../api/routing/types';
import { getOneFix } from '../../hooks/useLocationStream';
import type { RootStackParamList } from '../../navigation/types';
import { useNavigationSession } from '../../store/useNavigationSession';
import { useTheme, makeStyles } from '../../theme/useTheme';

/**
 * Route preview: destination (+ current GPS fix from getOneFix) → provider
 * directions via the routing service seam. Top option card (distance, minutes,
 * first 2 maneuver lines) + alternatives strip + the start handoff into the
 * turn-by-turn screen through useNavigationSession. No invented routes.
 */

const ROUTE_ERROR_AR: Record<RoutingErrorCode, string> = {
  missing_credentials: 'أضف مفتاح الخرائط لحساب الطريق',
  rate_limited: 'عدد الطلبات كثير — جرّب بعد شوي',
  network_error: 'ما في اتصال — تأكد من الشبكة وجرّب ثانية',
  malformed_response: 'جواب الخدمة مش مفهوم — جرّب ثانية',
  empty_result: 'ما في طريق مدروس لهالوجهة',
  provider_error: 'مشكلة بخدمة الخرائط — جرّب بعدين',
};

const ROUTE_ERROR_EN: Partial<Record<RoutingErrorCode, string>> = {
  missing_credentials: 'Add a maps token to complete routing — read app/src/api/routing/README.md',
};

function rowDirection(): 'row' | 'row-reverse' {
  return I18nManager.isRTL ? 'row-reverse' : 'row';
}

export function RoutePreviewScreen({
  route,
  navigation,
}: {
  route: { params?: { destination: PlaceHit } };
  navigation: NavigationProp<RootStackParamList>;
}) {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();

  const destination = route.params?.destination ?? null;
  const setPhase = useNavigationSession((st) => st.setPhase);
  const setDestination = useNavigationSession((st) => st.setDestination);
  const startNavigation = useNavigationSession((st) => st.startNavigation);
  const sessionDestination = useNavigationSession((st) => st.destination);

  const [options, setOptions] = useState<RouteOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<RoutingError | null>(null);

  const dest = destination ?? sessionDestination;

  useEffect(() => {
    if (!dest) return;
    setDestination(dest);
    setPhase('routing');
  }, [dest, setDestination, setPhase]);

  // backing out mid-routing → the session never started, leave it clean
  useEffect(() => {
    return () => {
      if (useNavigationSession.getState().phase === 'routing') {
        useNavigationSession.getState().reset();
      }
    };
  }, []);

  useEffect(() => {
    if (!dest) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const fix = await getOneFix();
        if (!fix) {
          // no GPS anchor yet — an origin is unknowable, so no request fires
          // (never fabricate a start point; the honest state is "start the GPS")
          if (!cancelled) {
            setOptions(null);
            setError({ code: 'network_error', status: null, message: 'ما في تحديد موقع بعد — شغّل الموقع وحاول ثانية' });
            setLoading(false);
          }
          return;
        }
        const origin = { lat: fix.lat, lng: fix.lng };
        // routing service seam — lazy import inside the handler, typed fallback
        const svc = await import('../../api/routing/service').then((m) => m.resolveRoutingProvider());
        const res = await svc.directions({
          origin,
          destination: { lat: dest.lat, lng: dest.lng },
          alternatives: true,
          language: 'ar',
        });
        if (cancelled) return;
        if (res.ok) {
          setOptions(res.value);
          setError(null);
        } else {
          setOptions(null);
          setError(res.error);
        }
      } catch {
        if (cancelled) return;
        setOptions(null);
        setError({ code: 'missing_credentials', status: null, message: 'provider module unavailable' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dest]);

  const top = options?.[0] ?? null;
  const alternatives = useMemo(() => options?.slice(1) ?? [], [options]);

  const onStart = () => {
    if (!top || !dest) return;
    startNavigation(top, alternatives, dest);
    navigation.navigate('Navigation');
  };

  if (!dest) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <Header />
        <View style={s.stateBox}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>ما في وجهة محددة — ابحث أول</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Header />

      <View style={s.destRow}>
        <Text style={[t.text.label, { color: t.colors.textSecondary }]}>الوجهة</Text>
        <Text style={[t.text.title, { color: t.colors.textPrimary }]} numberOfLines={1}>
          {dest.name}
        </Text>
        <Text style={[t.text.micro, { color: t.colors.textSecondary }]} numberOfLines={1}>
          {dest.subtitle}
        </Text>
      </View>

      {loading && (
        <View style={s.stateBox}>
          <Text style={[t.text.title, { color: t.colors.textSecondary }]}>جاري حساب الطريق…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={s.stateBox}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{ROUTE_ERROR_AR[error.code]}</Text>
          <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>{error.message}</Text>
          {ROUTE_ERROR_EN[error.code] && (
            <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>{ROUTE_ERROR_EN[error.code]}</Text>
          )}
        </View>
      )}

      {!loading && !error && top && (
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <TopRouteOptionCard option={top} />
          <Pressable style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.85 }]} onPress={onStart}>
            <Text style={[t.text.title, { color: '#FFFFFF' }]}>احجز هذه الطريق</Text>
          </Pressable>

          {alternatives.length > 0 && (
            <View style={s.altBlock}>
              <Text style={[t.text.label, { color: t.colors.textSecondary }]}>طرق بديلة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.altRow}>
                {alternatives.map((alt) => (
                  <View key={alt.id} style={s.altCard}>
                    <Text style={[t.text.label, { color: t.colors.textPrimary }]}>
                      {(alt.summary.distanceM / 1000).toFixed(1)} كم
                    </Text>
                    <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>
                      {Math.round(alt.summary.durationS / 60)} د
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

function Header() {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.headerRow}>
      <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>معاينة الطريق</Text>
    </View>
  );
}

/** Top route option: distance km, duration minutes, first two maneuver lines. */
function TopRouteOptionCard({ option }: { option: RouteOption }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.topCard}>
      <View style={[s.statRow, { flexDirection: rowDirection() }]}>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>
          {(option.summary.distanceM / 1000).toFixed(1)} كم
        </Text>
        <Text style={[t.text.title, { color: t.colors.textSecondary }]}>
          {Math.round(option.summary.durationS / 60)} د
        </Text>
      </View>
      <View style={s.maneuvers}>
        {option.summary.maneuvers.slice(0, 2).map((m, i) => (
          <Text key={`${m.type}:${i}`} style={[t.text.body, { color: t.colors.textPrimary }]} numberOfLines={1}>
            {m.instruction}
          </Text>
        ))}
        {option.summary.maneuvers.length === 0 && (
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>—</Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: t.spacing[4],
    },
    destRow: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: 12,
      gap: 2,
      marginHorizontal: t.spacing[4],
    },
    stateBox: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: 16,
      gap: t.spacing[2],
      margin: t.spacing[4],
      alignItems: 'flex-start',
    },
    body: { padding: t.spacing[4], gap: t.spacing[4] },
    topCard: {
      backgroundColor: t.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: 16,
      gap: t.spacing[2],
    },
    statRow: { alignItems: 'flex-end', gap: 12 },
    maneuvers: { gap: t.spacing[1] },
    startBtn: {
      backgroundColor: t.colors.accent,
      borderRadius: t.radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
    },
    altBlock: { gap: t.spacing[2] },
    altRow: { gap: t.spacing[2], paddingVertical: 4 },
    altCard: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 2,
      minWidth: 84,
    },
  }),
);
