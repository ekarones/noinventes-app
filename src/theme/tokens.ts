// Design tokens. One source of truth for size, rhythm and shape, so screens
// stop inventing their own numbers (the app had 15 font sizes, 21 padding values
// and 17 radii before this).

// ---- Interactive controls ----
//
// Heights respect the 44dp minimum touch target from the iOS HIG / Material
// guidelines. Prefer sizing a control to `TOUCH_MIN` over padding it out with
// `HIT_SLOP`: a slop makes the tappable area bigger than the thing you can see,
// which looks like a stray margin and lets neighbouring buttons steal taps.
export const TOUCH_MIN = 44;

export const CONTROL_HEIGHT = {
  pill: TOUCH_MIN, // header controls: sort, clear, QR
  md: 46, // secondary actions inside a card/sheet
  lg: 54, // the main call to action of a screen
  input: 50, // text fields
} as const;

// For taps that genuinely can't be sized up — an "✕" living inside a chip, an
// icon inside a text field. Everything else should just be `TOUCH_MIN` tall.
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// Press feedback for tappable rows/cards. Buttons use a pressed-background
// instead, which reads better than a fade. React Native's default is 0.2 — far
// too harsh, it makes every list tap flash.
export const ROW_PRESS_OPACITY = 0.75;

// ---- Shape ----
// Four steps, one per role — a rule you can say out loud instead of six numbers
// picked by eye. There used to be 8, 10, 12, 14, 16 and 18 all doing the same job
// (rounding a box), and nobody can see the difference between 10 and 12.
export const RADIUS = {
  badge: 8, // badges, counters, chips — anything that wraps a word
  control: 12, // inputs, buttons, icon boxes, thumbnails
  card: 16, // cards, panels, image frames
  sheet: 22, // bottom sheets
  pill: 999, // fully rounded — a pill or a circle, whatever its size
} as const;

// ---- Rhythm (4pt grid) ----
//
// `hairline` is the one step off the grid, and it is deliberate: 2px is an
// optical nudge (the subtitle sitting under a title), not a layout decision.
// Everything that separates or pads real blocks uses the grid — the app had
// drifted to 14 padding values, 12 margins and 10 gaps, including 3, 5, 6 and 7.
export const SPACING = {
  hairline: 2,
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
