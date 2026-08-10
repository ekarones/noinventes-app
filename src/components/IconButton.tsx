import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { SIZE, CONTROL_HEIGHT, FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Spoken by screen readers, and shown next to the icon when `label` is set. */
  accessibilityLabel: string;
  /** Renders the button as a labelled pill (the QR button) instead of a circle. */
  label?: string;
  /** Dims the content — for an inactive state (e.g. a disconnected printer). */
  muted?: boolean;
  /** Labelled variant: the "estilo filtro" order — label on the left, icon disc
   *  on the right (instead of the disc-then-label default). */
  accent?: boolean;
  disabled?: boolean;
};

// The action button that lives in a screen header. The header is the chrome fill,
// so this reads as an app-bar action: a translucent veil disc/pill with on-chrome
// content (navy on the seller's amber, white on the admin's navy), dimmer when muted.
export default function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  label,
  muted,
  accent,
  disabled,
}: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tint = muted ? colors.onChromeMuted : colors.onChrome;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        label ? styles.pill : styles.circle,
        accent && !!label && styles.pillAccent,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {!label ? (
        // Icon-only: the button already IS the disc.
        <Ionicons name={icon} size={20} color={tint} />
      ) : accent ? (
        // "Estilo filtro": the label on the left, the icon on a disc on the right.
        <>
          <Text style={[styles.label, styles.labelMedium, { color: tint }]}>{label}</Text>
          <View style={styles.disc}>
            <Ionicons name={icon} size={16} color={tint} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.disc}>
            <Ionicons name={icon} size={16} color={tint} />
          </View>
          <Text style={[styles.label, { color: tint }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    height: CONTROL_HEIGHT.pill,
    // A translucent veil, so the button reads as a control on the chrome bar.
    backgroundColor: colors.onChromeVeil,
  },
  // Both are fully-rounded: icon-only is a circle, the labelled a stadium.
  circle: { width: TOUCH_MIN, borderRadius: RADIUS.pill },
  // The labelled pill hugs its disc on the left, so it pays less padding there.
  pill: { paddingLeft: SPACING.xs, paddingRight: SPACING.md, borderRadius: RADIUS.pill },
  // "Estilo filtro": the disc rides the right, so the padding flips.
  pillAccent: { paddingLeft: SPACING.md, paddingRight: SPACING.xs },
  // Circular via RADIUS.pill, never width/2. A touch more opaque than the pill, so
  // the disc still reads inside it.
  disc: {
    width: SIZE.disc,
    height: SIZE.disc,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.onChromeVeilStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  label: { fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.bold },
  labelMedium: { fontFamily: FONT_FAMILY.medium },
});
