import * as React from 'react';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { useDesignSystem, type TextVariant } from '../theme/ThemeProvider';
import type { typeScale } from '../theme/tokens';

type UseStylesVariant = typeof typeScale[keyof typeof typeScale];

/** Respects the design system automatically — tokens flow via ThemeProvider. */
export function PlaceholderScreen({ title }: { title: string }): React.JSX.Element {
  const t = useDesignSystem();
  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: t.spacing[4] }}>
        <Text style={[t.text.headline, { color: t.colors.textPrimary }]}>{title}</Text>
        <Text style={[t.text.body, { color: t.colors.textSecondary }]}>
          Feature logic lands with the next build pass; tokens already drive this view.
        </Text>
      </ScrollView>
    </View>
  );
}

export function ScreenCard({ variant }: { variant: TextVariant }) {
  const t = useDesignSystem();
  const style: UseStylesVariant = t.text[variant];
  return (
    <View style={styles.card}>
      <Text style={[style, { color: t.colors.textSecondary }]}>{variant}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { height: 48, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
});

export const PLACEHOLDER_NOTES = 'Used by scaffold screens; swap for real UI as features land.';
