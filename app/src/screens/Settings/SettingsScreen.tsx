import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '../../navigation/types';
import type { AppTabParamList } from '../../navigation/types';
import { useTheme, makeStyles } from '../../theme/useTheme';
import { requestAllPermissions, openSystemSettings, type PermissionSnapshot } from '../../security/permissionGate';
import { useAppStatus } from '../../store/useAppStatus';
import { useState } from 'react';

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen(_props: SettingsScreenProps) {
  const t = useTheme();
  const s = useSettingsStyles();
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(null);
  const lastSyncIso = useAppStatus((st) => st.lastSyncIso);
  const setLastSync = useAppStatus((st) => st.setLastSync);

  const runGate = async () => {
    const snap = await requestAllPermissions();
    setSnapshot(snap);
    setLastSync(new Date().toISOString());
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>Settings</Text>

      <View style={s.group}>
        <Text style={[t.text.title, { color: t.colors.textPrimary }]}>Permissions</Text>
        <Text style={[t.text.micro, { color: t.colors.textSecondary }]}>
          Location background · notifications · network state
        </Text>
        <Pressable style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]} onPress={() => void runGate()}>
          <Text style={[t.text.label, { color: t.colors.textPrimary }]}>Request all</Text>
        </Pressable>
        <Pressable onPress={openSystemSettings}>
          <Text style={[t.text.label, { color: t.colors.accent }]}>Open system settings</Text>
        </Pressable>
        {snapshot && (
          <View style={s.snapshot}>
            {Object.entries(snapshot).map(([k, v]) => (
              <Text key={k} style={[t.text.micro, { color: t.colors.textSecondary }]}>
                {k}: {v}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={s.group}>
        <Text style={[t.text.title, { color: t.colors.textPrimary }]}>Data</Text>
        <Text style={[t.text.label, { color: t.colors.textSecondary }]}>
          Last sync: {lastSyncIso ?? 'never'}
        </Text>
      </View>

      <ScrollView style={s.scrollFill}>
        {/* TODO(name-brand): settings entries (units,语言的 locale, paywall link, about). */}
        <Text style={[t.text.micro, { color: t.colors.textDisabled }]}>More sections land with feature work.</Text>
      </ScrollView>
    </View>
  );
}

const useSettingsStyles = makeStyles((t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing[4], gap: t.spacing[4] },
    group: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: 16, gap: 10 },
    snapshot: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.border, paddingTop: 8, gap: 2 },
    button: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: t.radius.pill, backgroundColor: t.colors.primary },
    scrollFill: { flex: 1 },
  }),
);
