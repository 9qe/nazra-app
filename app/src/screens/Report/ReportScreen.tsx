import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { voice } from '../../theme/tokens';
import {
  addReport,
  clearReports,
  loadReports,
  newReportId,
  type LocalReport,
  type ReportType,
} from '../../data/localReports';
import { getOneFix } from '../../hooks/useLocationStream';
import { useAppStatus } from '../../store/useAppStatus';
import { useNazraSettings } from '../../store/useSettings';
import { TYPE_COLOR } from '../../data/radarDataset';
import { useTheme, makeStyles } from '../../theme/useTheme';

/**
 * Real local-first report flow: pick a tile, optional note, capture a fix
 * (only when the user already granted foreground location), store to
 * AsyncStorage on this device. No server, no upload, no fake "submitted".
 * Submit speaks the Zeizo thank-you line when voice is on.
 */
export function ReportScreen() {
  const t = useTheme();
  const s = useReportStyles();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ReportType>('fixed');
  const [note, setNote] = useState('');
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [busy, setBusy] = useState(false);
  const voiceOn = useNazraSettings((st) => st.voiceOn);
  const setLastSync = useAppStatus((st) => st.setLastSync);

  useEffect(() => {
    let cancelled = false;
    void loadReports().then((rs) => {
      if (!cancelled) setReports(rs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      const fix = await getOneFix();
      const entry: LocalReport = {
        id: newReportId(),
        type: category,
        note: note.trim(),
        lat: fix?.lat ?? null,
        lng: fix?.lng ?? null,
        accuracyM: fix?.accuracyM ?? null,
        createdAt: new Date().toISOString(),
      };
      const next = await addReport(entry);
      setReports(next);
      setNote('');
      setLastSync(entry.createdAt);
      if (voiceOn) {
        try {
          Speech.stop();
          Speech.speak(voice.jordanian.report_thanks, { language: 'ar-JO', rate: 1.05 });
        } catch {
          // TTS unavailable — report still saved
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAll = async () => {
    const next = await clearReports();
    setReports(next);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>بلاغ جديد</Text>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>شفت شي بالموقع؟ بلّغنا — نظرة بتفكّر الحسنات.</Text>
        <View style={s.grid}>
          {REPORT_TILES.map((tile) => (
            <Pressable
              key={tile.key}
              onPress={() => setCategory(tile.key)}
              style={[s.tile, category === tile.key && { borderColor: t.colors.primary }]}
            >
              <Text style={{ fontSize: 22 }}>{tile.glyph}</Text>
              <Text style={[t.text.label, { color: t.colors.textPrimary }]}>{tile.label}</Text>
              <View style={[s.tileDot, { backgroundColor: TYPE_COLOR[tile.key === 'other' ? 'locality' : tile.key] }]} />
            </Pressable>
          ))}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="ملاحظة (اختياري) — مثلاً: ضبطة تحت جسر الكبش"
          placeholderTextColor={t.colors.textDisabled}
          multiline
          style={[s.input, { color: t.colors.textPrimary, borderColor: t.colors.border }]}
        />
        <Pressable
          disabled={busy}
          onPress={() => void submit()}
          style={({ pressed }) => [s.submit, (pressed || busy) && { opacity: 0.85 }]}
        >
          <Text style={[t.text.title, { color: '#FFFFFF' }]}>{busy ? 'بحفظ…' : 'أرسل البلاغ'}</Text>
        </Pressable>
        <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
          محفوظ محلياً على جهازك فقط — ما في سيرفر بعد v1، لا رفع ولا مزامنة.
        </Text>

        <View style={s.savedHead}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>بلاغاتي ({reports.length})</Text>
          {reports.length > 0 && (
            <Pressable onPress={() => void removeAll()} hitSlop={6}>
              <Text style={[t.text.label, { color: t.colors.critical }]}>حذف الكل</Text>
            </Pressable>
          )}
        </View>
        {reports.map((r) => (
          <View key={r.id} style={s.savedRow}>
            <Text style={[t.text.label, { color: t.colors.textPrimary }]} numberOfLines={1}>
              {`${r.type} · ${r.createdAt.slice(0, 16).replace('T', ' ')}`}
            </Text>
            <Text style={[t.text.micro, { color: t.colors.textDisabled }]} numberOfLines={1}>
              {r.lat != null && r.lng != null ? `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)} (±${r.accuracyM?.toFixed(0) ?? '?'}م)${r.note ? ` — ${r.note}` : ''}` : 'بلا إحداثيات (بلا إذن وقت الإرسال)'}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const REPORT_TILES: Array<{ key: ReportType; glyph: string; label: string }> = [
  { key: 'light', glyph: '💡', label: 'كاميرا إشارة' },
  { key: 'fixed', glyph: '🛑', label: 'رادار ثابت' },
  { key: 'avg', glyph: '📏', label: 'متوسط السرعة' },
  { key: 'locality', glyph: '🚨', label: 'ضبطة' },
  { key: 'bump', glyph: '🐢', label: 'مطبّ' },
  { key: 'other', glyph: '✋', label: 'غير ذلك' },
];

const useReportStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing[4] },
    body: { gap: t.spacing[3], paddingBottom: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] },
    tile: {
      width: '31%',
      minWidth: 100,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      padding: 12,
      gap: 4,
    },
    tileDot: { width: 8, height: 8, borderRadius: 999 },
    input: { minHeight: 88, borderWidth: 1, borderRadius: t.radius.md, padding: 12, textAlignVertical: 'top' },
    submit: { padding: 16, borderRadius: t.radius.lg, backgroundColor: t.colors.primary, alignItems: 'center' },
    savedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    savedRow: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      padding: 10,
      gap: 2,
    },
  }),
);
