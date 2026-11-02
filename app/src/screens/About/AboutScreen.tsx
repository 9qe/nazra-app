import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CAMERA_COUNT, DATASET_META, ZONE_COUNT } from '../../data/radarDataset';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { appNameAr, voice } from '../../theme/tokens';

/**
 * About: identity, versions, dataset provenance (honest counts + sources),
 * privacy line, engine stack. Replaces the removed Paywall — there is no
 * subscription in this app.
 */
export function AboutScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const t = useTheme();
  const s = useAboutStyles();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={[t.text.label, { color: t.colors.accent }]}>↩︎ رجوع</Text>
        </Pressable>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>حول {appNameAr} نظرة</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.block}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>النسخة</Text>
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
            {`v${version} — native iOS · Expo 58 · React Native 0.88.1 · شاشات RN حقيقية (بلا WebView)`}
          </Text>
        </View>
        <View style={s.block}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>البيانات</Text>
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
            {`${CAMERA_COUNT} كاميرا · ${ZONE_COUNT} مقاطع متوسط — مضمّنة بالحزمة وبتشتغل أوفلاين.`}
          </Text>
          <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
            {`المصادر: ${DATASET_META.sources.join(' + ')} · توليد ${DATASET_META.generated} · ${DATASET_META.verified_count} موثّقة ميدانياً`}
          </Text>
          <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>{DATASET_META.note}</Text>
        </View>
        <View style={s.block}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>الخصوصية</Text>
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
            بياناتك مو عندنا: إعداداتك وبلاغاتك محفوظة محلياً على جهازك. ما في حساب، ما في تتبّع، ما في إعلانات، ما في بيع موقعك.
          </Text>
        </View>
        <View style={s.block}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>التحت الميكانيكي</Text>
          <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>
            الخريطة: Apple Maps (MapKit عبر react-native-maps — بلا مفاتيح) · الموقع: expo-location while-in-use ·
            الصوت: expo-speech ar-JO / ar ×1.05 · الاهتزاز: expo-haptics · المحرك: haversine + atan2 + قياس متوسط بالمقاطع، مع إعادة تسليح 45 ثانية وفاصل 900 مللي.
          </Text>
        </View>
        <View style={s.block}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>الخط القانوني</Text>
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
            التنبيهات إرشادية من مصادر عامة — ما هي أداة التزام رسمية ولا مرجع ضبط مروري؛ النقاط والغرامات حسب أنظمة الأمانة والمرور.
          </Text>
        </View>
        <View style={s.block}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>الصوت</Text>
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>{voice.manifesto[1]}</Text>
          <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>{voice.manifesto[2]}</Text>
        </View>
      </ScrollView>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const useAboutStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: t.spacing[4] },
    body: { padding: t.spacing[4], gap: t.spacing[4], paddingBottom: 32 },
    block: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: 16,
      gap: 8,
    },
  }),
);
