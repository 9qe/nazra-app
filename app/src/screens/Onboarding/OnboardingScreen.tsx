import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestLocationForeground, openSystemSettings } from '../../security/permissionGate';
import { useAppStatus } from '../../store/useAppStatus';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { appNameAr, voice } from '../../theme/tokens';

/* appNameAr retained for About copy; heading uses the plain glyph below. */
void appNameAr;

/**
 * Real onboarding: brand intro + location rationale + the real expo-location
 * request (foreground, while-in-use). A user who declines still gets in —
 * demo mode pins them on the Amman default view, stated plainly, no fakes.
 */
export function OnboardingScreen() {
  const t = useTheme();
  const s = useOnboardingStyles();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAppStatus((st) => st.completeOnboarding);
  const [locState, setLocState] = useState<'idle' | 'granted' | 'denied'>('idle');

  const askLocation = async () => {
    const granted = (await requestLocationForeground()) === 'granted';
    setLocState(granted ? 'granted' : 'denied');
  };

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={[t.text.display, { color: t.colors.textPrimary }]}>نظرة</Text>
        <Text style={[t.text.title, { color: t.colors.accent }]}>
          {voice.jordanian.first_launch.replace('أهلين! 🧿 أنا نظرة — ', '')}
        </Text>
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>{voice.manifesto[0]}</Text>

        <View style={s.features}>
          <FeatureRow>{'كاميرات ومقاطع جاهزة أوفلاين — ١٧٧ كاميرا و ٩ مقاطع متوسط مضمّنين بالتطبيق'}</FeatureRow>
          <FeatureRow>{'تنبيه صوتي بلهجتك (زيزو) قبل الكاميرا، وقياس متوسط السرعة بالمقاطع'}</FeatureRow>
          <FeatureRow>{'بلاغات الجماعة — محفوظة على جهازك'}</FeatureRow>
        </View>

        <View style={s.permCard}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>إذن الموقع</Text>
          <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
            نظرة بتستخدم الموقع وأنت بتستخدم التطبيق بس — لعرض الكاميرات العدّك، والتنبيهات قبلها.
            ما منحكي عن الموقع بالخلفية (الوضع الدائم بجهة native بيجي بتحديث لاحق).
          </Text>
          <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
            ما منببيع موقعك، وما في إعلانات — البيانات كلها على جهازك.
          </Text>
          <Pressable style={({ pressed }) => [s.button, s.buttonAccent, pressed && { opacity: 0.85 }]} onPress={() => void askLocation()}>
            <Text style={[t.text.title, { color: '#FFFFFF' }]}>فعّل الموقع</Text>
          </Pressable>
          {locState === 'denied' && (
            <View style={s.deniedRow}>
              <Text style={[t.text.label, { color: t.colors.warn }]}>الإذن مقفول — رح تدخل ديمو على عمّان المركز.</Text>
              <Pressable onPress={openSystemSettings} hitSlop={4}>
                <Text style={[t.text.label, { color: t.colors.accent, textDecorationLine: 'underline' }]}>
                  فتح إعدادات النظام
                </Text>
              </Pressable>
            </View>
          )}
          {locState === 'granted' && (
            <Text style={[t.text.label, { color: t.colors.success }]}>تمام — الموقع مفعّل وينفع مع أول مسار.</Text>
          )}
        </View>

        <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
          {`وضع الديمو: تغتّي بلا إذن، تتحرك على خريطة افتراضية بلا تنبيهات حقيقية. الخط القانوني: التنبيهات إرشادية من مصادر عامة (GAM/المرور المركزي عبر الصحافة + OSM) — الالتزام بالحد مسؤوليتك. ${voice.rule}`}
        </Text>
      </ScrollView>
      <Pressable style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]} onPress={completeOnboarding}>
        <Text style={[t.text.title, { color: '#FFFFFF' }]}>يلا نسوق 🍉</Text>
      </Pressable>
    </View>
  );
}

function FeatureRow({ children }: { children: string }) {
  const t = useTheme();
  const s = useOnboardingStyles();
  return (
    <View style={s.featureRow}>
      <View style={s.featureDot} />
      <Text style={[t.text.label, { color: t.colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const useOnboardingStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    body: { flexGrow: 1, padding: t.spacing[5], gap: t.spacing[4] },
    features: { gap: t.spacing[3] },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    featureDot: { width: 8, height: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.accent },
    permCard: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: 16,
      gap: 10,
    },
    deniedRow: { gap: 6 },
    button: { paddingVertical: 12, borderRadius: t.radius.md, alignItems: 'center' },
    buttonAccent: { backgroundColor: t.colors.accent },
    cta: {
      marginHorizontal: t.spacing[4],
      marginBottom: t.spacing[3],
      paddingVertical: t.spacing[4],
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.primary,
      alignItems: 'center',
    },
  }),
);
