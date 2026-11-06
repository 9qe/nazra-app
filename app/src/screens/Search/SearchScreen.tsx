import { useEffect, useRef, useState } from 'react';
import { FlatList, I18nManager, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigationProp } from '@react-navigation/native';
import type { PlaceHit, RoutingError, RoutingErrorCode } from '../../api/routing/types';
import { getOneFix } from '../../hooks/useLocationStream';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme, makeStyles } from '../../theme/useTheme';

/**
 * Destination search: text input → provider geocode via the routing service
 * seam. Every failure maps to a RoutingError.code — no fabricated hits, no
 * mock data, ever. Arabic-first copy with English fallback line under it.
 */

const MIN_QUERY_CHARS = 3;
const DEBOUNCE_MS = 350;
const MAX_HITS = 12;

const SEARCH_ERROR_AR: Record<RoutingErrorCode, string> = {
  missing_credentials: 'أضف مفتاح الخرائط لإكمال البحث',
  rate_limited: 'عدد الطلبات كثير — استنى شوي وجرّب مرّة ثانية',
  network_error: 'ما في اتصال — تأكد من الشبكة وجرّب ثانية',
  malformed_response: 'جواب الخدمة مش مفهوم — جرّب صياغة ثانية',
  empty_result: 'ما لقينا نتائج — جرّب اسم ثاني أو أقرب',
  provider_error: 'مشكلة بخدمة الخرائط — جرّب بعدين',
};

const SEARCH_ERROR_EN: Partial<Record<RoutingErrorCode, string>> = {
  missing_credentials: 'Add a maps token to complete search — read app/src/api/routing/README.md',
};

/** RTL/LTR row direction from the device layout — inline per the house rule. */
export function rowDirection(): 'row' | 'row-reverse' {
  return I18nManager.isRTL ? 'row-reverse' : 'row';
}

export function SearchScreen({ navigation }: { navigation: NavigationProp<RootStackParamList> }) {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [hits, setHits] = useState<PlaceHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<RoutingError | null>(null);
  const searchSeq = useRef(0);

  // debounce: emit the trimmed query only after the keys stop for DEBOUNCE_MS
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debounced.length < MIN_QUERY_CHARS) return;
    const seq = ++searchSeq.current;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        // near-bias one-shot fix; optional for the provider — missing is fine
        const fix = await getOneFix();
        // routing service seam owned by the api agent — imported lazily inside
        // the handler; if the module is mid-write the typed fallback fires
        const svc = await import('../../api/routing/service').then((m) => m.resolveRoutingProvider());
        const res = await svc.geocode({
          query: debounced,
          near: fix ? { lat: fix.lat, lng: fix.lng } : undefined,
          language: 'ar',
          limit: MAX_HITS,
        });
        if (seq !== searchSeq.current) return;
        if (res.ok) {
          setHits(res.value);
          setError(null);
        } else {
          setHits(null);
          setError(res.error);
        }
      } catch {
        // provider module unavailable (import failure) — same typed shape
        if (seq !== searchSeq.current) return;
        setHits(null);
        setError({ code: 'missing_credentials', status: null, message: 'provider module unavailable' });
      } finally {
        if (seq === searchSeq.current) setLoading(false);
      }
    })();
  }, [debounced]);

  const onSelect = (hit: PlaceHit) => {
    navigation.navigate('RoutePreview', { destination: hit });
  };

  const shortQuery = debounced.length < MIN_QUERY_CHARS;
  const emptyResult = error?.code === 'empty_result';

  const body = (() => {
    if (shortQuery && !loading) {
      return (
        <View style={s.stateBox}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>ابدأ بكتابة الوجهة</Text>
          <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>Type a destination to start</Text>
        </View>
      );
    }
    if (loading) {
      return (
        <View style={s.stateBox}>
          <Text style={[t.text.title, { color: t.colors.textSecondary }]}>جاري البحث…</Text>
        </View>
      );
    }
    if (error && !emptyResult) {
      return (
        <View style={s.stateBox}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{SEARCH_ERROR_AR[error.code]}</Text>
          <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>{error.message}</Text>
          {SEARCH_ERROR_EN[error.code] && (
            <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>{SEARCH_ERROR_EN[error.code]}</Text>
          )}
        </View>
      );
    }
    if (emptyResult) {
      return (
        <View style={s.stateBox}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{SEARCH_ERROR_AR.empty_result}</Text>
        </View>
      );
    }
    if (!hits || hits.length === 0) return null;
    return (
      <FlatList
        data={hits}
        keyExtractor={(h) => h.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [s.hitRow, pressed && { opacity: 0.85 }]}
            onPress={() => onSelect(item)}
          >
            <View style={s.hitRowInner}>
              <View style={{ flex: 1 }}>
                <Text style={[t.text.body, { color: t.colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[t.text.micro, { color: t.colors.textSecondary }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={[t.text.label, { color: t.colors.accent }]}>↩</Text>
            </View>
          </Pressable>
        )}
      />
    );
  })();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={[t.text.label, { color: t.colors.accent }]}>↩︎ رجوع</Text>
        </Pressable>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>بحث وجهة</Text>
      </View>
      <View style={[s.inputWrap, { flexDirection: rowDirection() }]}>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="وين بدك توصل؟"
          placeholderTextColor={t.colors.textDisabled}
          returnKeyType="search"
          autoCorrect={false}
          maxLength={120}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Text style={[t.text.label, { color: t.colors.textSecondary }]}>✕</Text>
          </Pressable>
        )}
      </View>
      {body}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: t.spacing[4] },
    inputWrap: {
      alignItems: 'center',
      gap: t.spacing[2],
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginHorizontal: t.spacing[4],
    },
    input: {
      flex: 1,
      color: t.colors.textPrimary,
      fontSize: 16,
      padding: 0,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
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
    listContent: { padding: t.spacing[4], gap: t.spacing[2] },
    hitRow: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      padding: 12,
    },
    hitRowInner: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
  }),
);
