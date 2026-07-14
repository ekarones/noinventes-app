// Design tokens. One source of truth for size, rhythm and shape, so screens
// stop inventing their own numbers (the app had 15 font sizes, 21 padding values
// and 17 radii before this).

// ---- Interactive controls ----
//
// Heights respect the 44dp minimum touch target from the iOS HIG / Material
// guidelines. Anything visually smaller than that (icon buttons, pills) must
// pass `HIT_SLOP` so the *tappable* area still clears the minimum.
export const CONTROL_HEIGHT = {
  pill: 40, // header controls: sort, clear, QR
  md: 46, // secondary actions inside a card/sheet
  lg: 54, // the main call to action of a screen
  input: 50, // text fields
} as const;

// Expands the touch area of small controls to a comfortable ~56dp.
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// Press feedback for tappable rows/cards. Buttons use a pressed-background
// instead, which reads better than a fade. React Native's default is 0.2 — far
// too harsh, it makes every list tap flash.
export const ROW_PRESS_OPACITY = 0.75;

// ---- Shape ----
export const RADIUS = {
  sm: 8, // badges, small chips
  md: 12, // inputs, secondary buttons
  lg: 14, // primary buttons
  xl: 16, // cards
  sheet: 22, // bottom sheets
  pill: 999, // fully rounded
} as const;

// ---- Rhythm (4pt grid) ----
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

// ---- Type scale ----
// Sizes step in a readable ratio instead of drifting a point at a time. There is
// deliberately no 10 or 17: a one-point difference is invisible, so those only
// ever meant "someone eyeballed it". They snap to `badge` and `heading`.
export const FONT_SIZE = {
  avatar: 36, // the initial inside a profile avatar
  display: 28, // the login title
  screenTitle: 26, // the big title of a tab screen
  sectionValue: 24, // a KPI figure / cart total
  title: 22, // a product/entity name
  titleSm: 20, // a name inside a detail header
  heading: 18, // screen header (pushed screens), section titles, money totals
  subheading: 16, // card titles, sheet titles
  body: 15, // default readable text
  bodySm: 14, // secondary text, list metadata
  caption: 13, // hints, labels
  micro: 12, // footnotes
  badge: 11, // pills and counters
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '600',
  bold: '700',
} as const;
