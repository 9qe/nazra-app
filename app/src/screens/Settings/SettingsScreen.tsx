import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  CAMERA_COUNT,
  DATASET_META,
  ZONE_COUNT,
} from '../../data/radarDataset';
import { clearReports, loadReports } from '../../data/localReports';
import { useNazraSettings } from '../../store/useSettings';
import { useAppStatus } from '../../store/useAppStatus';
import {
  requestLocationForeground,
  openSystemSettings,
} from '../../security/permissionGate';
import { useTheme, makeStyles } from '../../theme/useTheme';

type CompositeNav = { navigation: { navigate: (name: 'About') => void } };

/**
 * Real settings over the persisted store: preDist (ring ladder), threshold
 * (absolute / percent), voice mode + MSA wording, haptics, and the
 * deliberately disabled background row — iOS 'always' needs native
 * background-mode config we have NOT shipped, so the row says so.
 */
export function SettingsScreen({ navigation }: CompositeNav) {
  const t = useTheme();
  const s = useSettingsStyles();
  const insets = useSafeAreaInsets();
  const settings = useNazraSettings();
  const set = settings.set;
  const [locState, setLocState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [reportCount, setReportCount] = useState(0);
  const lastSyncIso = useAppStatus((st) => st.lastSyncIso);

  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then((st) =>
      setLocState(st.granted ? 'granted' : 'denied'),
    );
    void loadReports().then((r) => setReportCount(r.length));
  }, []);

  const askLocation = async () => {
    const granted = (await requestLocationForeground()) === 'granted';
    setLocState(granted ? 'granted' : 'denied');
  };

  const preDists = [250, 500, 1000] as const;
  const absOptions = [5, 10, 15] as const;
  const pctOptions = [10, 15, 20] as const;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>الإعدادات</Text>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* alert distance */}
        <Group title="مقدار التنبيه الصوتي (preDist)" sub="يضبط سلّم الحلقات: 500 ⇒ 500/300/150 م قبل الكاميرا">
          <ChipRow
            options={preDists.map((v) => ({ value: v, label: `${v} م` }))}
            selected={settings.preDistM}
            onSelect={(v) => set({ preDistM: v })}
            activeColor={t.colors.primary}
          />
        </Group>

        {/* over-limit threshold */}
        <Group title="عتبة التجاوز" sub="متى يعتبر التنبيه 'فوق الحد'">
          <ChipRow
            options={[
              { value: 'abs' as const, label: `مطلق ⁺${settings.thresholdAbsKph} كم/س` },
              { value: 'pct' as const, label: `نسبة ⁺${settings.thresholdPct}%` },
            ]}
            selected={settings.thresholdMode}
            onSelect={(v) => set({ thresholdMode: v })}
            activeColor={t.colors.accent}
          />
          {settings.thresholdMode === 'abs' ? (
            <ChipRow
              options={absOptions.map((v) => ({ value: v, label: `${v} كم/س` }))}
              selected={settings.thresholdAbsKph}
              onSelect={(v) => set({ thresholdAbsKph: v })}
              activeColor={t.colors.accent}
            />
          ) : (
            <ChipRow
              options={pctOptions.map((v) => ({ value: v, label: `${v}%` }))}
              selected={settings.thresholdPct}
              onSelect={(v) => set({ thresholdPct: v })}
              activeColor={t.colors.accent}
            />
          )}
        </Group>

        {/* voice + haptics */}
        <Group title="التنبيهات">
          <SwitchRow
            label="الصوت (زيزو — ar-JO ×1.05)"
            value={settings.voiceOn}
            onChange={(v) => set({ voiceOn: v })}
            accent={t.colors.accent}
          />
          <SwitchRow
            label="فصحى بدل اللهجة (MSA)"
            value={settings.msa}
            onChange={(v) => set({ msa: v })}
            accent={t.colors.accent}
          />
          <SwitchRow
            label="اهتزاز الإشعارات"
            value={settings.vibe}
            onChange={(v) => set({ vibe: v })}
            accent={t.colors.accent}
          />
        </Group>

        {/* background — honest, disabled */}
        <Group title="التنبيه بالخلفية" sub="غير متاح بعد: iOS يطلب وضع background native (UIBackgroundModes) — بند التطوير الجاي. التطبيق الحالي: while-in-use بس.">
          <SwitchRow label="تسريحات خلفية" value={settings.bgAlertsOff} onChange={() => undefined} disabled accent={t.colors.textDisabled} />
        </Group>

        {/* permissions */}
        <Group title="الأذونات">
          <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
            {`الموقع: ${locState === 'granted' ? 'مفعّل ✔' : locState === 'denied' ? 'مقفول ✋' : '…'}`}
          </Text>
          <Pressable style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]} onPress={() => void askLocation()}>
            <Text style={[t.text.label, { color: '#FFFFFF' }]}>طلب إذن الموقع</Text>
          </Pressable>
          <Pressable onPress={openSystemSettings} hitSlop={4}>
            <Text style={[t.text.label, { color: t.colors.accent }]}>فتح إعدادات النظام</Text>
          </Pressable>
        </Group>

        {/* data */}
        <Group title="البيانات" sub={`${CAMERA_COUNT} كاميرا · ${ZONE_COUNT} مقاطع · مصادر: ${DATASET_META.sources.join(' + ')} · توليد ${DATASET_META.generated}`}>
          <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>{DATASET_META.note}</Text>
          <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
            {`بلاغات محفوظة محلياً: ${reportCount} · وقت لقطة الصلاحيات: ${lastSyncIso ?? '—'}`}
          </Text>
          <Pressable
            style={({ pressed }) => [s.btnGhost, pressed && { opacity: 0.8 }]}
            onPress={() => {
              void (async () => {
                await clearReports();
                setReportCount(0);
              })();
            }}
          >
            <Text style={[t.text.label, { color: t.colors.critical }]}>حذف البلاغات المحفوظة</Text>
          </Pressable>
        </Group>

        {/* about */}
        <Pressable style={({ pressed }) => [s.aboutRow, pressed && { opacity: 0.8 }]} onPress={() => navigation.navigate('About')}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>حول نظرة</Text>
          <Text style={[t.text.label, { color: t.colors.accent }]}>›</Text>
        </Pressable>
      </ScrollView>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

function Group({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const t = useTheme();
  const s = useSettingsStyles();
  return (
    <View style={s.group}>
      <Text style={[t.text.title, { color: t.colors.textPrimary }]}>{title}</Text>
      {sub && <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>{sub}</Text>}
      {children}
    </View>
  );
}

function ChipRow<T extends string | number>({
  options,
  selected,
  onSelect,
  activeColor,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (v: T) => void;
  activeColor: string;
}) {
  const t = useTheme();
  const s = useSettingsStyles();
  return (
    <View style={s.chipRow}>
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          onPress={() => onSelect(o.value)}
          style={[
            s.chip,
            selected === o.value && { backgroundColor: activeColor, borderColor: activeColor },
          ]}
        >
          <Text style={[t.text.label, { color: selected === o.value ? '#FFFFFF' : t.colors.textSecondary }]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
  accent,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  disabled?: boolean;
}) {
  const t = useTheme();
  const s = useSettingsStyles();
  return (
    <View style={s.switchRow}>
      <Text style={[t.text.label, { color: disabled ? t.colors.textDisabled : t.colors.textPrimary, flex: 1 }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: accent, false: t.colors.surfaceRaised }}
        thumbColor="#EDEFF6"
      />
    </View>
  );
}

const useSettingsStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    body: { padding: t.spacing[3], gap: t.spacing[3] },
    group: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: 16,
      gap: 10,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    btn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: t.radius.pill, backgroundColor: t.colors.accent },
    btnGhost: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.colors.border },
    aboutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
  }),
);
