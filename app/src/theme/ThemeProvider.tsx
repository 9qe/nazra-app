import { createContext, useContext, type ReactNode } from 'react';
import { useTheme, type ThemeValue } from './useTheme';
import type { TextVariant } from './tokens';

const ThemeCtx = createContext<ThemeValue>(useTheme());

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeCtx.Provider value={useTheme()}>{children}</ThemeCtx.Provider>;
}

/** Stable context accessor; falls back to the frozen default theme. */
export function useDesignSystem(): ThemeValue {
  return useContext(ThemeCtx);
}

export type { TextVariant };
