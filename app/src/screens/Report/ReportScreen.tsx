import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '../../navigation/types';
import type { AppTabParamList } from '../../navigation/types';
import type { ReportCategory } from '../../types/radar';
import { useTheme, makeStyles } from '../../theme/useTheme';

type ReportScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, 'Report'>,
  NativeStackScreenProps<RootStackParamList>
>;

const CATEGORIES: Array<{ key: ReportCategory; label: string }> = [
  { key: 'radar', label: 'Radar' },
  { key: 'police', label: 'Police' },
  { key: 'hazard', label: 'Hazard' },
  { key: 'congestion', label: 'Traffic' },
];

export function ReportScreen(_props: ReportScreenProps) {
  const t = useTheme();
  const s = useReportStyles();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ReportCategory>('radar');
  const [note, setNote] = useState('');

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>Report</Text>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.row}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[s.chip, category === c.key && { backgroundColor: t.colors.primary }]}
            >
              <Text style={[t.text.label, { color: t.colors.textPrimary }]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What did you see? (optional)"
          placeholderTextColor={t.colors.textDisabled}
          multiline
          style={[s.input, { color: t.colors.textPrimary, borderColor: t.colors.border }]}
        />
        {/* Submit posts to the local API stub; wire persist/queue with feature work. */}
        {/* TODO(research): replace with queued-report pipeline for offline sending. */}
        <Pressable style={({ pressed }) => [s.submit, pressed && { opacity: 0.85 }]}>
          <Text style={[t.text.title, { color: t.colors.textPrimary }]}>Submit report</Text>
        </Pressable>
        <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>
          Submit is a stub in the scaffold: no network, no persistence yet.
        </Text>
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

const useReportStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing[4] },
    body: { gap: t.spacing[4] },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceRaised, borderWidth: 1, borderColor: t.colors.border },
    input: { minHeight: 96, borderWidth: 1, borderRadius: t.radius.md, padding: 12, textAlignVertical: 'top' },
    submit: { padding: 16, borderRadius: t.radius.lg, backgroundColor: t.colors.primary, alignItems: 'center' },
  }),
);
