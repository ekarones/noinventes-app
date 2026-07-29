// Brand palette. A warm coral-orange refined from the logo's #ff3822 — nudged a
// touch off pure red toward orange and pulled back from neon, so it sits calmer
// on the off-white UI and reads apart from the destructive red.
export const colors = {
  primary: '#ef5a2c',
  primaryDark: '#d0481f',
  primaryLight: '#f57e57',
  primarySoft: '#fef1ec', // tint used for input backgrounds / subtle surfaces
  primarySoftPressed: '#fde2d7', // pressed state for soft/outline buttons

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
  textOnPrimary: '#ffffff',

  border: '#e5e7eb',
  borderFocused: '#ef5a2c',

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
