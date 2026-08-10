import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { palettes, colors, type Palette } from './colors';

// Role-based theming. The provider picks the palette (seller = orange, admin =
// blue); components read the active primary at render time via `useTheme()` or
// `useThemedStyles()`. This is why the primary can't just live in a static
// `StyleSheet.create` — that bakes at module load, before the role is known.

const ThemeContext = createContext<Palette>(colors);

export function ThemeProvider({
  role,
  children,
}: {
  role: 'admin' | 'seller';
  children: ReactNode;
}) {
  const theme = role === 'admin' ? palettes.admin : palettes.seller;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// The active palette (neutrals + the role's primary). Use for inline colours.
export function useTheme(): Palette {
  return useContext(ThemeContext);
}

// Themed StyleSheet: pass a factory `(colors) => StyleSheet.create({...})` and it
// re-creates the styles when the theme changes. Naming the param `colors` keeps
// the style body identical to a static one — only the wrapper changes.
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme]);
}
