import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typeScale, layout, type TextVariant } from './tokens';

/**
 * Theme hook: tokens are module constants, so the resolved theme is built once
 * and handed to the provider — every screen reads the same frozen object.
 */
export type ThemeValue = {
  colors: typeof colors;
  radius: typeof radius;
  spacing: readonly number[];
  text: typeof typeScale;
  layout: typeof layout;
};

export const RESOLVED_THEME: ThemeValue = { colors, radius, spacing, text: typeScale, layout };

export function useTheme(): ThemeValue {
  return RESOLVED_THEME;
}

/** Zero-arg style hook factory: `const s = makeStyles((t) => StyleSheet.create({...}))` then `s()`. */
export function makeStyles<T extends Record<string, object>>(factory: (t: ThemeValue) => T): () => T {
  return function useStyles(): T {
    return factory(RESOLVED_THEME);
  };
}
