// Brand palette, drawn from the app icon: an amber gold, a deep navy, and a
// red-orange accent, over neutral greys.
//
// The icon's lesson — and the rule here — is that amber only works as a FILL with
// dark content, never as ink on white. So the palette splits two ideas:
//   - `primary` + its family = the NAVY "ink", shared by both roles. It's every
//     foreground accent (prices, icons, active states, soft-badge text) — always
//     legible on white.
//   - `chrome*` = the header bars and primary CTA buttons, the one surface that
//     tells the roles apart: the seller's chrome is the icon's amber (navy
//     content), the admin's is navy (white content).
//
// Consume all of this through the theme (`useTheme()` / `useThemedStyles()` in
// `src/theme/theme.tsx`), not this static object — `colors` is the seller palette,
// kept as the default for neutral-only styles and as a fallback.

const neutrals = {
  // A soft off-white so the pure-white surfaces (cards, panels, sheets) read as
  // raised against the page instead of blending into it.
  background: '#f4f5f7',
  surface: '#ffffff',
  // A neutral fill, for a box that has to read as a container and not as an
  // accent. Sits between `surface` and `border` in the same grey ramp as
  // `textSecondary`, so a muted icon on it lands at a comfortable contrast.
  surfaceMuted: '#f3f4f6',

  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  // Content on the navy `primary` fills (avatar disc, add button, featured badge):
  // white, for both roles, because `primary` is navy for both.
  textOnPrimary: '#ffffff',

  border: '#e5e7eb',
  // Softer neutrals from the 5a language: hairline separators inside cards, the
  // control outline, and the segmented-track fill.
  separator: '#eef0f4',
  controlBorder: '#dfe2ea',
  fill: '#f1f3f7',

  // The icon's red-orange, kept as a single shared accent for count badges and
  // the like (a notification pop, conventionally red).
  accent: '#f5411a',

  // Status, each with the soft fill that carries it as a badge. The three come as
  // a set: the stock badge picks one of them by level, so a missing soft tint
  // means a badge with no background.
  error: '#dc2626',
  errorSoft: '#fef2f2', // destructive tint: pressed state, banners, warnings
  success: '#16a34a',
  successSoft: '#f0fdf4',
  warning: '#d97706', // low-stock / caution
  warningSoft: '#fffbeb',
};

// The shared "ink" — navy, from the icon's outlines. Every primary-coloured
// foreground (text, icon, active state, soft-badge) reads from here, so it stays
// legible on white for BOTH roles. Amber never plays this role.
const navyInk = {
  primary: '#16213a',
  primaryDark: '#0f1728',
  primaryLight: '#33405f',
  primarySoft: '#eceff5', // tint used for input backgrounds / subtle surfaces
  primarySoftPressed: '#dcdfec', // pressed state for soft/outline buttons
  borderFocused: '#16213a',
};

// The seller's chrome — the icon's amber, with navy content sitting on it, exactly
// as the icon draws its dark marks on the yellow. The veils (translucent navy) are
// the app-bar discs/pills that ride on the header.
const sellerChrome = {
  chromeFill: '#ffc20e',
  chromeFillPressed: '#e6ac00',
  onChrome: '#16213a',
  onChromeVeil: 'rgba(22, 33, 58, 0.10)',
  onChromeVeilStrong: 'rgba(22, 33, 58, 0.16)',
  onChromeMuted: 'rgba(22, 33, 58, 0.45)',
  // Header decorations + the profile button that ride on the amber chrome, and
  // the active tab pill's fill.
  headerCircle: 'rgba(255, 255, 255, 0.34)',
  chromeButtonBg: '#ffffff',
  chromeButtonBorder: 'rgba(22, 33, 58, 0.14)',
  tabActiveBg: '#fff3cf',
};

// The admin's chrome — navy, with white content: here chrome and ink are the same
// hue, so the admin reads as one calm navy interface.
const adminChrome = {
  chromeFill: '#16213a',
  chromeFillPressed: '#0f1728',
  onChrome: '#ffffff',
  onChromeVeil: 'rgba(255, 255, 255, 0.18)',
  onChromeVeilStrong: 'rgba(255, 255, 255, 0.28)',
  onChromeMuted: 'rgba(255, 255, 255, 0.55)',
  // On the navy chrome the decorative circle is amber; the profile button is a
  // translucent white square; the tab pill a cool grey.
  headerCircle: '#ffc20e',
  chromeButtonBg: 'rgba(255, 255, 255, 0.12)',
  chromeButtonBorder: 'rgba(255, 255, 255, 0.22)',
  tabActiveBg: '#e8ebf2',
};

// The two full palettes the theme chooses between by role.
export const palettes = {
  seller: { ...neutrals, ...navyInk, ...sellerChrome },
  admin: { ...neutrals, ...navyInk, ...adminChrome },
};

export type Palette = typeof palettes.seller;

// The default palette (seller): the fallback outside a ThemeProvider, and what
// neutral-only styles read. Themed styles must use `useTheme()`.
export const colors: Palette = palettes.seller;
